load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "classifier",
    data = ["tachyons.min.4.12.0.css"],
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
        "@npm//hast-util-raw",
        "@npm//hast-util-select",
        "@npm//hast-util-to-string",
        "@npm//human-interval",
        "@npm//node-red",
        "@npm//unist-util-visit",
        "@npm//wink-naive-bayes-text-classifier",
        "@npm//wink-nlp-utils",
        "@npm//zod",
    ],
)
