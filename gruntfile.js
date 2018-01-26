module.exports = function(grunt){
    grunt.initConfig({
        eslint: {
            src: ["./dev/*.js"]
        },

        concat: {
            options: {
                sourceMap: true
            },
            files: {
                src: ["dev/*.js"],
                dest: "dist/game.concat.js"
            }
        },

        uglify: {
            my_target: {
                options: {
                    sourceMap: {
                        includeSources: true,
                    },
                    mangle: false,
                },
                files: {
                    "dist/game.min.js" : ["dist/game.concat.js"]
                }
            }
        },

        watch: {
            files: {
                files: ["dev/*.js"],
                tasks: ["eslint", "concat", "uglify"]
            }
        },
    })

    grunt.loadNpmTasks("grunt-contrib-watch")
    grunt.loadNpmTasks("grunt-contrib-concat")
    grunt.loadNpmTasks("grunt-contrib-uglify-es")
    grunt.loadNpmTasks("gruntify-eslint")

    grunt.registerTask("default", ["watch"])
}