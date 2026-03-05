cmake_minimum_required(VERSION 3.16)
project(omp_socket_trace LANGUAGES CXX)

add_library(omp-socket-trace SHARED wsock_trace.cpp)
set_target_properties(omp-socket-trace PROPERTIES
    OUTPUT_NAME "omp-socket-trace"
    PREFIX ""
)

target_compile_features(omp-socket-trace PRIVATE cxx_std_17)
target_link_libraries(omp-socket-trace PRIVATE ws2_32)
