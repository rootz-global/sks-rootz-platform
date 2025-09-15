// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IEmailWalletRegistration {
    function isRegistered(address user) external view returns (bool);
    function deductCredits(address user, uint256 amount) external returns (bool);
}
