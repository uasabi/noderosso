load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "twitter",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:axios",
        "//nodes:worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//node-red",
        "@npm//zod",
        "@npm//twitter-api-client",
        "@npm//axios"
    ],
)
