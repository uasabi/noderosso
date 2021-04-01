load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "gcalendar",
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//nodes:worker_node",
        "//types",
        "@npm//@types/express",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//date-fns",
        "@npm//googleapis",
        "@npm//node-red",
        "@npm//zod",
    ],
)
