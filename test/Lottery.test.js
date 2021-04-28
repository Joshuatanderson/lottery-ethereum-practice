const assert = require("assert"); //node main library
const ganache = require("ganache-cli");
const Web3 = require("web3");

const web3 = new Web3(ganache.provider());

const { interface, bytecode } = require("../compile");

let lottery;
let accounts;

beforeEach(async () => {
	accounts = await web3.eth.getAccounts();

	lottery = await new web3.eth.Contract(JSON.parse(interface))
		.deploy({ data: bytecode })
		.send({ from: accounts[0], gas: "1000000" });
});

describe("Lottery Contract", () => {
	it("deploys a contract", () => {
		assert.ok(lottery.options.address);
	});

	// when someone enters the lottery,
	// and they have enough money,
	// they will be in the players array
	it("allows one account to enter", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("0.02", "ether"),
		});

		const players = await lottery.methods.getPlayers().call({
			from: accounts[0],
		});
		assert.strictEqual(accounts[0], players[0]);
		assert.strictEqual(1, players.length);
	});
	it("allows two accounts to enter", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("0.02", "ether"),
		});
		await lottery.methods.enter().send({
			from: accounts[1],
			value: web3.utils.toWei("0.02", "ether"),
		});
		const players = await lottery.methods.getPlayers().call({
			from: accounts[0],
		});

		assert.strictEqual(players[0], accounts[0]);
		assert.strictEqual(players[1], accounts[1]);
		assert.strictEqual(2, players.length);
	});
	it("requires a minimum amount of ether to enter", async () => {
		try {
			await lottery.methods.enter().send({
				from: accounts[0],
				value: web3.utils.toWei("0.0001", "ether"),
			});
			assert(false); // you know this will fail the test.
			// The test should fail if the await doesn't throw an error
		} catch (err) {
			assert(err);
		}
	});

	it("does not allow a non-manager account to call restricted functions", async () => {
		try {
			await lottery.methods.pickWinner().send({
				from: accounts[1],
			});
			assert(false);
		} catch (err) {
			assert(err);
		}
	});

	it("sends money to the winner", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("1", "ether"),
		});

		const initialBalance = await web3.eth.getBalance(accounts[0]);
		await lottery.methods.pickWinner().send({
			from: accounts[0],
		});
		const finalBalance = await web3.eth.getBalance(accounts[0]);
		const difference = finalBalance - initialBalance;

		assert(difference > web3.utils.toWei(".8", "ether")); // accounts for payment after gas cost
	});

	it("resets the players list after the lottery", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("1", "ether"),
		});
		await lottery.methods.pickWinner().send({
			from: accounts[0],
		});
		const players = await lottery.methods
			.getPlayers()
			.call({ from: accounts[0] });
		assert.strictEqual(players.length, 0);
	});

	it("has no balance after ending the lottery", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("1", "ether"),
		});
		await lottery.methods.pickWinner().send({
			from: accounts[0],
		});
		const balance = await web3.eth.getBalance(lottery.options.address);
		assert.strictEqual(parseInt(balance), 0);
	});
	it("has a last winner after ending the lottery", async () => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei("1", "ether"),
		});
		await lottery.methods.pickWinner().send({
			from: accounts[0],
		});
		const winner = await lottery.methods.lastWinner().call();
		console.log(`lastwinner:${winner}`);
		assert.strictEqual(winner, accounts[0]);
	});
});
