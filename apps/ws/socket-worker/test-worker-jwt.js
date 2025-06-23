#!/usr/bin/env node

const WebSocket = require('ws');
const jwt = require('@tsndr/cloudflare-worker-jwt');

// Test configuration
const WORKER_URL = 'wss://socket-worker.cli-shortener.workers.dev/ws';
const HTTP_URL = 'https://socket-worker.cli-shortener.workers.dev';
const JWT_SECRET = process.env.JWT_SECRET || '%LOCAL_TEST&@Ub4&9s'; // Read from environment or use local default

// Generate a real JWT token
async function generateJWTToken(userInfo) {
	const payload = {
		_id: userInfo.userId,
		firstName: userInfo.firstName,
		lastName: userInfo.lastName,
		email: userInfo.email,
		subscriberId: userInfo.subscriberId,
		organizationId: userInfo.organizationId,
		environmentId: userInfo.environmentId,
		aud: 'widget_user',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
	};

	return await jwt.sign(payload, JWT_SECRET);
}

// Test user information
const testUser = {
	userId: `test-user-id-${Date.now()}`,
	firstName: 'Test',
	lastName: 'User',
	email: 'test@example.com',
	subscriberId: `test-subscriber-id-${Date.now()}`,
	organizationId: 'test-org-id-123',
	environmentId: 'test-env-id-123',
};

async function testJWTAuthentication() {
	console.log('🔐 Testing JWT Authentication...\n');

	// Test 1: Valid JWT token
	console.log('✅ Test 1: Valid JWT Token');
	try {
		const token = await generateJWTToken(testUser);
		console.log('Generated JWT token:', `${token.substring(0, 50)}...`);

		const ws = new WebSocket(WORKER_URL, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Connection timeout'));
			}, 5000);

			ws.on('open', () => {
				clearTimeout(timeout);
				console.log('✅ WebSocket connected with valid JWT');
				ws.close();
				resolve();
			});

			ws.on('message', (data) => {
				const message = JSON.parse(data.toString());
				console.log('📥 Received:', message);
			});

			ws.on('error', (error) => {
				clearTimeout(timeout);
				reject(error);
			});

			ws.on('close', () => {
				console.log('🔌 Connection closed\n');
				resolve();
			});
		});
	} catch (error) {
		console.error('❌ Valid JWT test failed:', error.message);
	}

	// Test 2: Invalid JWT token
	console.log('❌ Test 2: Invalid JWT Token');
	try {
		const ws = new WebSocket(WORKER_URL, {
			headers: {
				Authorization: 'Bearer invalid.jwt.token',
			},
		});

		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				console.log('✅ Connection correctly rejected (timeout as expected)');
				resolve();
			}, 3000);

			ws.on('open', () => {
				clearTimeout(timeout);
				console.log('❌ Connection should have been rejected');
				ws.close();
				resolve();
			});

			ws.on('error', (error) => {
				clearTimeout(timeout);
				console.log('✅ Connection correctly rejected:', error.message);
				resolve();
			});
		});
	} catch (error) {
		console.log('✅ Invalid JWT correctly rejected:', error.message);
	}

	// Test 3: Missing Authorization header
	console.log('❌ Test 3: Missing Authorization Header');
	try {
		const ws = new WebSocket(WORKER_URL);

		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				console.log('✅ Connection correctly rejected (timeout as expected)');
				resolve();
			}, 3000);

			ws.on('open', () => {
				clearTimeout(timeout);
				console.log('❌ Connection should have been rejected');
				ws.close();
				resolve();
			});

			ws.on('error', (error) => {
				clearTimeout(timeout);
				console.log('✅ Connection correctly rejected:', error.message);
				resolve();
			});
		});
	} catch (error) {
		console.log('✅ Missing auth correctly rejected:', error.message);
	}
}

async function testMultipleUsers() {
	console.log('👥 Testing Multiple Users...\n');

	const users = [
		{
			...testUser,
			userId: `user-1-${Date.now()}`,
			subscriberId: `subscriber-1-${Date.now()}`,
			firstName: 'Alice',
		},
		{
			...testUser,
			userId: `user-2-${Date.now()}`,
			subscriberId: `subscriber-2-${Date.now()}`,
			firstName: 'Bob',
		},
	];

	const connections = [];

	try {
		// Create connections for both users
		for (const user of users) {
			const token = await generateJWTToken(user);
			const ws = new WebSocket(WORKER_URL, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			connections.push({ ws, user });

			await new Promise((resolve) => {
				ws.on('open', () => {
					console.log(`✅ ${user.firstName} connected`);
					resolve();
				});

				ws.on('message', (data) => {
					const message = JSON.parse(data.toString());
					console.log(`📥 ${user.firstName} received:`, message.event);
				});
			});
		}

		// Test sending messages
		console.log('\n📤 Testing message sending...');

		for (const { user } of connections) {
			const response = await fetch(`${HTTP_URL}/api/send`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					userId: user.userId,
					event: 'test_notification',
					data: {
						title: 'Test Message',
						message: `Hello ${user.firstName}!`,
					},
				}),
			});

			if (response.ok) {
				console.log(`✅ Message sent to ${user.firstName}`);
			} else {
				console.log(`❌ Failed to send message to ${user.firstName}`);
			}
		}

		// Wait a moment for messages to be received
		await new Promise((resolve) => setTimeout(resolve, 1000));
	} catch (error) {
		console.error('❌ Multi-user test failed:', error);
	} finally {
		// Close all connections
		connections.forEach(({ ws, user }) => {
			ws.close();
			console.log(`🔌 ${user.firstName} disconnected`);
		});
	}
}

async function main() {
	console.log('🚀 Testing Cloudflare Worker with JWT Authentication\n');
	console.log(`Worker URL: ${HTTP_URL}`);
	console.log(`WebSocket URL: ${WORKER_URL}\n`);

	try {
		await testJWTAuthentication();
		console.log(`\n${'='.repeat(50)}\n`);
		await testMultipleUsers();

		console.log('\n🎉 All JWT authentication tests completed!');
	} catch (error) {
		console.error('❌ Test suite failed:', error);
		process.exit(1);
	}
}

main();
