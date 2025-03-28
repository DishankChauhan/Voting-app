// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const JAN_1ST_2030 = 1893456000;
// Use BigInt constructor instead of literal syntax for ES compatibility
const ONE_GWEI: bigint = BigInt('1000000000');

const LockModule = buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);

  const Lock = m.contract("Lock", [unlockTime], {
    value: ONE_GWEI,
  });

  return { Lock };
});

export default LockModule;
