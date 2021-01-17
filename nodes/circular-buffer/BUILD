load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "circular-buffer",
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
        "@npm//zod",
    ],
)
