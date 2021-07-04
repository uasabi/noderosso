load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "tweet-importer",
    data = ["tachyons.min.4.12.0.css"],
    test_data = [],
    test_deps = [
        "//types",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/worker_node",
        "//types",
        "@npm//@types/express",
        "@npm//@types/node",
        "@npm//cloudinary",
        "@npm//csv-parse",
        "@npm//express",
        "@npm//node-red",
        "@npm//zod",
    ],
)
