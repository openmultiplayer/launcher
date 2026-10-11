use std::ffi::{c_void, OsStr, OsString};
use std::io;
use std::mem::{size_of, zeroed};
use std::os::windows::ffi::{OsStrExt, OsStringExt};
use std::path::Path;
use std::ptr::{addr_of, null, null_mut};
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, INVALID_HANDLE_VALUE};
use windows_sys::Win32::Storage::FileSystem::*;

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

#[repr(C)]
struct ObjectAttributes {
    length: u32,
    root_directory: HANDLE,
    object_name: *mut UnicodeString,
    attributes: u32,
    security_descriptor: *mut c_void,
    security_quality_of_service: *mut c_void,
}

#[repr(C)]
struct IoStatusBlock {
    status: usize,
    information: usize,
}

#[link(name = "ntdll")]
extern "system" {
    fn NtCreateFile(
        handle: *mut HANDLE,
        access: u32,
        attributes: *mut ObjectAttributes,
        status: *mut IoStatusBlock,
        allocation_size: *const i64,
        file_attributes: u32,
        share_access: u32,
        disposition: u32,
        options: u32,
        ea_buffer: *const c_void,
        ea_length: u32,
    ) -> i32;
    fn RtlNtStatusToDosError(status: i32) -> u32;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct Identity {
    volume: u64,
    id: [u8; 16],
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) struct Resource {
    pub identity: Identity,
    pub bytes: u64,
    modified: i64,
}

pub(super) struct Handle(HANDLE);

pub(super) struct DirectoryBuffer(Vec<u64>);

impl Default for DirectoryBuffer {
    fn default() -> Self {
        Self(vec![0; 8192])
    }
}

impl Drop for Handle {
    fn drop(&mut self) {
        unsafe { CloseHandle(self.0) };
    }
}

impl Handle {
    pub fn documents(path: &Path) -> io::Result<Self> {
        let resolved = path.canonicalize()?;
        let name: Vec<u16> = resolved.as_os_str().encode_wide().chain(Some(0)).collect();
        let handle = unsafe {
            CreateFileW(
                name.as_ptr(),
                FILE_LIST_DIRECTORY | FILE_READ_ATTRIBUTES,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                null(),
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS,
                0,
            )
        };
        if handle == INVALID_HANDLE_VALUE {
            return Err(io::Error::last_os_error());
        }
        let handle = Self(handle);
        handle.ensure_regular_directory()?;
        Ok(handle)
    }

    // FILE_OPEN_REPARSE_POINT prevents traversal through the final component,
    // ancestors are already handles. Excluding share-delete pins each identity.
    pub fn child(&self, name: &OsStr, directory: bool, deleting: bool) -> io::Result<Self> {
        let mut wide: Vec<u16> = name.encode_wide().collect();
        if wide.is_empty()
            || wide.len() > 32767
            || wide.iter().any(|c| matches!(*c, 0 | 47 | 92 | 58))
            || name == OsStr::new(".")
            || name == OsStr::new("..")
        {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "unsafe_path"));
        }
        let mut unicode = UnicodeString {
            length: (wide.len() * 2) as u16,
            maximum_length: (wide.len() * 2) as u16,
            buffer: wide.as_mut_ptr(),
        };
        let mut attributes = ObjectAttributes {
            length: size_of::<ObjectAttributes>() as u32,
            root_directory: self.0,
            object_name: &mut unicode,
            attributes: 0x40,
            security_descriptor: null_mut(),
            security_quality_of_service: null_mut(),
        };
        let mut status: IoStatusBlock = unsafe { zeroed() };
        let mut handle = 0;
        let result = unsafe {
            NtCreateFile(
                &mut handle,
                FILE_READ_ATTRIBUTES
                    | 0x00100000
                    | if directory { FILE_LIST_DIRECTORY } else { 0 }
                    | if deleting { DELETE } else { 0 },
                &mut attributes,
                &mut status,
                null(),
                0,
                if deleting {
                    0
                } else {
                    FILE_SHARE_READ | FILE_SHARE_WRITE
                },
                1,
                0x00200000 | 0x20,
                null(),
                0,
            )
        };
        if result < 0 {
            return Err(io::Error::from_raw_os_error(unsafe {
                RtlNtStatusToDosError(result) as i32
            }));
        }
        let handle = Self(handle);
        let flags = handle.attributes()?;
        if flags & FILE_ATTRIBUTE_REPARSE_POINT != 0 {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "reparse_point"));
        }
        if (flags & FILE_ATTRIBUTE_DIRECTORY != 0) != directory {
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "cache_changed"));
        }
        Ok(handle)
    }

    fn info<T>(&self, class: FILE_INFO_BY_HANDLE_CLASS) -> io::Result<T> {
        let mut value: T = unsafe { zeroed() };
        let success = unsafe {
            GetFileInformationByHandleEx(
                self.0,
                class,
                &mut value as *mut T as *mut c_void,
                size_of::<T>() as u32,
            )
        };
        if success == 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(value)
        }
    }

    pub fn attributes(&self) -> io::Result<u32> {
        Ok(self
            .info::<FILE_ATTRIBUTE_TAG_INFO>(FileAttributeTagInfo)?
            .FileAttributes)
    }

    fn ensure_regular_directory(&self) -> io::Result<()> {
        let flags = self.attributes()?;
        if flags & FILE_ATTRIBUTE_DIRECTORY == 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid_cache_root",
            ));
        }
        Ok(())
    }

    pub fn identity(&self) -> io::Result<Identity> {
        let value = self.info::<FILE_ID_INFO>(FileIdInfo)?;
        Ok(Identity {
            volume: value.VolumeSerialNumber,
            id: value.FileId.Identifier,
        })
    }

    pub fn resource(&self) -> io::Result<Resource> {
        let standard = self.info::<FILE_STANDARD_INFO>(FileStandardInfo)?;
        let basic = self.info::<FILE_BASIC_INFO>(FileBasicInfo)?;
        if standard.EndOfFile < 0 {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "invalid_size"));
        }
        Ok(Resource {
            identity: self.identity()?,
            bytes: standard.EndOfFile as u64,
            modified: basic.LastWriteTime,
        })
    }

    // Enumerate by handle as well: renaming an ancestor cannot redirect traversal
    pub fn for_each_child(
        &self,
        buffer: &mut DirectoryBuffer,
        mut visit: impl FnMut(&OsStr, bool, bool) -> io::Result<()>,
    ) -> io::Result<()> {
        let buffer = &mut buffer.0;
        let mut count = 0;
        let mut restart = true;
        loop {
            let success = unsafe {
                GetFileInformationByHandleEx(
                    self.0,
                    if restart {
                        FileIdBothDirectoryRestartInfo
                    } else {
                        FileIdBothDirectoryInfo
                    },
                    buffer.as_mut_ptr() as *mut c_void,
                    (buffer.len() * 8) as u32,
                )
            };
            restart = false;
            if success == 0 {
                let error = io::Error::last_os_error();
                if error.raw_os_error() == Some(18) {
                    break;
                }
                return Err(error);
            }
            let mut offset = 0usize;
            loop {
                if offset + size_of::<FILE_ID_BOTH_DIR_INFO>() > buffer.len() * 8 {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "invalid_directory_entry",
                    ));
                }
                let pointer = unsafe {
                    (buffer.as_ptr() as *const u8).add(offset) as *const FILE_ID_BOTH_DIR_INFO
                };
                let header = unsafe { pointer.read_unaligned() };
                let name_pointer = unsafe { addr_of!((*pointer).FileName) as *const u16 };
                let start = name_pointer as usize - buffer.as_ptr() as usize;
                let length = header.FileNameLength as usize;
                if length % 2 != 0 || start + length > buffer.len() * 8 {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "invalid_directory_entry",
                    ));
                }
                let name = OsString::from_wide(unsafe {
                    std::slice::from_raw_parts(name_pointer, length / 2)
                });
                if name != OsStr::new(".") && name != OsStr::new("..") {
                    if count >= super::MAX_TREE_NODES {
                        return Err(io::Error::new(io::ErrorKind::InvalidData, "scan_limit"));
                    }
                    count += 1;
                    visit(
                        &name,
                        header.FileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0,
                        header.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT != 0,
                    )?;
                }
                if header.NextEntryOffset == 0 {
                    break;
                }
                let step = header.NextEntryOffset as usize;
                if step < size_of::<FILE_ID_BOTH_DIR_INFO>()
                    || step % 8 != 0
                    || offset + step >= buffer.len() * 8
                {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "invalid_directory_entry",
                    ));
                }
                offset += step;
            }
        }
        Ok(())
    }

    pub fn delete(self) -> io::Result<()> {
        let info = FILE_DISPOSITION_INFO { DeleteFile: 1 };
        let success = unsafe {
            SetFileInformationByHandle(
                self.0,
                FileDispositionInfo,
                &info as *const _ as *const c_void,
                size_of::<FILE_DISPOSITION_INFO>() as u32,
            )
        };
        if success == 0 {
            Err(io::Error::last_os_error())
        } else {
            Ok(())
        }
    }
}
