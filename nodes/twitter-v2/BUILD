load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "twitter-v2",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/axios",
        "//packages/worker_node",
        "//types",
        "@npm//@types/node",
        "@npm//axios",
        "@npm//leven",
        "@npm//node-red",
        "@npm//twitter-api-client",
        "@npm//zod",
    ],
)
