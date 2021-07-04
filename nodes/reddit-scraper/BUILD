load("//nodes:index.bzl", "node")

package(default_visibility = ["//visibility:public"])

node(
    name = "reddit-scraper",
    test_data = [
        "fixture.json",
        "fixture-article.json",
        "fixture-self.json",
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
        "//types",
        "@npm//@types/node",
        "@npm//chrono-node",
        "@npm//date-fns",
        "@npm//node-red",
        "@npm//querystring",
        "@npm//zod",
    ],
)
