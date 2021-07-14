load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "link-store",
    test_data = [
        "fixture.json",
        "fixture-article.json",
    ],
    test_deps = [
        "//types",
        "@npm//@types/node",
        "@npm//@types/tape",
        "@npm//tape",
    ],
    deps = [
        "//packages/axios",
        "//packages/worker_node",
        "//packages/context",
        "//types",
        "@npm//@types/node",
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//normalize-url",
        "@npm//zod",
    ],
)
