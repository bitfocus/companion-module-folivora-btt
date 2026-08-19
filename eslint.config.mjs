import js from '@eslint/js'
import globals from 'globals'

export default [
	js.configs.recommended,
	{
		files: ['src/**/*.js'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: { ...globals.node },
		},
		rules: {
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		},
	},
	{
		ignores: ['legacy/**', 'node_modules/**'],
	},
]
