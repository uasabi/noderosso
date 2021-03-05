load("@npm//@bazel/typescript:index.bzl", "ts_library", "ts_project")

package(default_visibility = ["//visibility:public"])

#ts_library(
#    name = "types",
#    srcs = glob(["*.d.ts"]),
#)

ts_project(
    name = "types",
    validate = False,
    tsconfig = "//:tsconfig",
)