"""worker
"""

load("@build_bazel_rules_nodejs//:index.bzl", "generated_file_test")
load("@npm//@bazel/rollup:index.bzl", "rollup_bundle")

def worker(
        name,
        entry_point,
        generated_bundle,
        srcs = [],
        deps = [],
        **kwargs):
    rollup_bundle(
        name = "bundle_%s" % name,
        srcs = srcs,
        entry_point = entry_point,
        config_file = ":rollup.config.js",
        deps = deps,
        sourcemap = "false",
    )

    generated_file_test(
        name = name,
        src = generated_bundle,
        generated = "bundle_%s" % name,
    )
