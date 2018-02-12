"use strict"
module.exports = function(grunt){
    grunt.initConfig({
        eslint: {
            options: {
                fix: true
            },
            src: ["./dist/*concat.js", "*.js"]
        },

        concat: {
            options: {
                sourceMap: true
            },
            files: {
                src: ["dev/GameBoard.js", "dev/GamePlayer.js", "dev/GameLogic.js", "dev/auth.js"],
                dest: "dist/game.concat.js"
            },
            vr: {
                src: ["dev/GameBoard.js", "dev/GamePlayer.js", "dev/GameLogic.js", "dev/VRGameBoard.js", "dev/scriptVR.js"],
                dest: "dist/scriptVR.concat.js"
            }
        },

        uglify: {
            my_target: {
                options: {
                    sourceMap: {
                        includeSources: true
                    },
                    mangle: false
                },
                files: {
                    "dist/game.min.js" : ["dist/game.concat.js"],
                    "dist/script2D.min.js" : ["dev/script2D.js"],
                    "dist/scriptVR.min.js" : ["dist/scriptVR.concat.js"]
                }
            }
        },

        watch: {
            files: {
                files: ["dev/*.js"],
                tasks: ["concat", "eslint", "uglify"]
            },
            serverside: {
                files: ["*.js"],
                tasks: ["eslint"]
            }
        }
    })

    grunt.loadNpmTasks("grunt-contrib-watch")
    grunt.loadNpmTasks("grunt-contrib-concat")
    grunt.loadNpmTasks("grunt-contrib-uglify-es")
    grunt.loadNpmTasks("gruntify-eslint")

    grunt.registerTask("default", ["watch"])
}
