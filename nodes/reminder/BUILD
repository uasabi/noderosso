load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "reminder",
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
        "@npm//@types/express",
        "@npm//@types/luxon",
        "@npm//node-red",
        "@npm//zod",
        "@npm//googleapis",
        "@npm//luxon"
    ],
)
