cmake_minimum_required(VERSION 3.14)
project(astar_chisinau C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O2")

# ── Shared library (for Python ctypes / FFI) ──────────────────────────────
add_library(astar_lib SHARED astar.c)
target_include_directories(astar_lib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
set_target_properties(astar_lib PROPERTIES
    OUTPUT_NAME "astar"
    C_VISIBILITY_PRESET hidden          # hide everything except EXPORT
)
if(UNIX)
    target_link_libraries(astar_lib m)  # link libm on Linux / macOS
endif()

# ── CLI test executable ───────────────────────────────────────────────────
add_executable(astar_cli main.c astar.c)
target_include_directories(astar_cli PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
if(UNIX)
    target_link_libraries(astar_cli m)
endif()
