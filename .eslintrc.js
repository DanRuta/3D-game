module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
    },
    "parserOptions": {
        "ecmaVersion": 2017
    },
    "rules": {
        "indent": [
            "error",
            4,
            {
                "SwitchCase": 1,
                "MemberExpression": 0
            }
        ],
        "no-unused-vars": [
            1
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "never"
        ],
        "no-var": [
            "error"
        ],
        "strict": [
            "error"
        ],
        "prefer-arrow-callback": [
            "error"
        ],
        "prefer-const": [
            "error"
        ],
        "prefer-destructuring": [
            1,
            {
                "object": true
            }
        ],
        "no-extra-parens": [
            "error"
        ],
        "comma-dangle": [
            "error",
            "never"
        ],
        "keyword-spacing": [
            "error",
            {
                before: true,
                after: true
            }
        ],
        "no-mixed-spaces-and-tabs": [
            "error"
        ]
    }
}