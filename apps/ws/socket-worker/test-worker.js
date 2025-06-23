#!/usr/bin/env node

const WebSocket = require('ws');

// Test configuration
const WORKER_URL = 'wss://socket-worker.cli-shortener.workers.dev/ws';
const HTTP_URL = 'https://socket-worker.cli-shortener.workers.dev';

// Generate a test JWT token
function generateTestToken() {
	const header = { alg: 'HS256', typ: 'JWT' };
	const payload = {
		_id: `test-user-id-${Date.now()}`,
		firstName: 'Test',
		lastName: 'User',
		email: 'test@example.com',
		subscriberId: `test-subscriber-id-${Date.now()}`,
		organizationId: 'test-org-id-123',
		environmentId: 'test-env-id-123',
		aud: 'widget_user',
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
	};

	// Simple base64 encoding (for testing only)
	const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
	const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

	return `${encodedHeader}.${encodedPayload}.test-signature`;
}

// Test WebSocket connection
async function testWebSocket() {
	console.log('🔌 Testing WebSocket Connection...');

	const token = generateTestToken();
	const wsUrl = `${WORKER_URL}?token=${encodeURIComponent(token)}`;

	return new Promise((resolve, reject) => {
		const ws = new WebSocket(wsUrl);
		let connected = false;

		ws.on('open', () => {
			console.log('✅ WebSocket connected successfully');
			connected = true;

			// Send a ping message
			const pingMessage = {
				type: 'ping',
				timestamp: Date.now(),
			};

			console.log('📤 Sending ping message...');
			ws.send(JSON.stringify(pingMessage));
		});

		ws.on('message', (data) => {
			try {
				const message = JSON.parse(data.toString());
				console.log('📥 Received message:', JSON.stringify(message, null, 2));

				if (message.type === 'pong') {
					console.log('✅ Ping/Pong test successful');
					ws.close();
					resolve(true);
				}
			} catch (error) {
				console.log('📥 Received raw message:', data.toString());
			}
		});

		ws.on('close', (code, reason) => {
			console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
			if (connected) {
				resolve(true);
			} else {
				reject(new Error('Connection closed before successful test'));
			}
		});

		ws.on('error', (error) => {
			console.error('❌ WebSocket error:', error.message);
			reject(error);
		});

		// Timeout after 10 seconds
		setTimeout(() => {
			if (!connected) {
				ws.close();
				reject(new Error('Connection timeout'));
			}
		}, 10000);
	});
}

// Test HTTP API
async function testHttpAPI() {
	console.log('\n🌐 Testing HTTP API...');

	try {
		// Test health endpoint
		console.log('📤 Testing health endpoint...');
		const healthResponse = await fetch(`${HTTP_URL}/health`);
		console.log(`✅ Health check: ${healthResponse.status} - ${await healthResponse.text()}`);

		// Test send message endpoint
		console.log('📤 Testing send message endpoint...');
		const sendResponse = await fetch(`${HTTP_URL}/api/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userId: 'test-user-id-123',
				event: 'notification_received',
				data: {
					title: 'HTTP API Test',
					message: 'This message was sent via HTTP API',
					timestamp: Date.now(),
				},
			}),
		});

		const result = await sendResponse.text();
		console.log(`✅ Send message: ${sendResponse.status} - ${result}`);

		return true;
	} catch (error) {
		console.error('❌ HTTP API error:', error.message);

		return false;
	}
}

// Test multiple connections
async function testMultipleConnections() {
	console.log('\n👥 Testing multiple connections...');

	const connections = [];
	const numConnections = 3;

	for (let i = 0; i < numConnections; i += 1) {
		const token = generateTestToken();
		const wsUrl = `${WORKER_URL}?token=${encodeURIComponent(token)}`;

		const ws = new WebSocket(wsUrl);
		connections.push(ws);

		ws.on('open', () => {
			console.log(`✅ Connection ${i + 1} established`);
		});

		ws.on('message', (data) => {
			const message = JSON.parse(data.toString());
			console.log(`📥 Connection ${i + 1} received:`, message.event || message.type);
		});
	}

	// Wait a bit for connections to establish
	await new Promise((resolve) => {
		setTimeout(resolve, 2000);
	});

	// Close all connections
	connections.forEach((ws, i) => {
		ws.close();
		console.log(`🔌 Connection ${i + 1} closed`);
	});

	return true;
}

// Run all tests
async function runTests() {
	console.log('🚀 Starting Cloudflare Worker Tests\n');
	console.log(`Worker URL: ${HTTP_URL}`);
	console.log(`WebSocket URL: ${WORKER_URL}\n`);

	try {
		await testWebSocket();
		await testHttpAPI();
		await testMultipleConnections();

		console.log('\n🎉 All tests completed successfully!');
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		process.exit(1);
	}
}

// Run tests if this script is executed directly
if (require.main === module) {
	runTests();
}
