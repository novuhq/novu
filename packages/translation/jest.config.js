/** @type {import('jest').Config} */
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	testEnvironmentOptions: {},
	moduleNameMapper: {
		axios: "axios/dist/node/axios.cjs",
	},
	testMatch: ["**/*.spec.ts"],
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts", "!src/**/index.ts"],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov"],
};
