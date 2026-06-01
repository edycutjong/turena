// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./CounterTradeEscrow.sol";

contract MockRevertingReceiver {
    CounterTradeEscrow public escrow;
    bool public shouldReenter;
    uint256 public activeCycleId;

    constructor(address payable _escrow) {
        escrow = CounterTradeEscrow(_escrow);
    }

    function setReenter(bool _shouldReenter, uint256 _cycleId) external {
        shouldReenter = _shouldReenter;
        activeCycleId = _cycleId;
    }

    function placeBet(uint256 cycleId, uint8 agentChoice) external payable {
        escrow.placeBet{value: msg.value}(cycleId, agentChoice);
    }

    function claim(uint256 cycleId) external {
        escrow.claim(cycleId);
    }

    receive() external payable {
        if (shouldReenter) {
            escrow.claim(activeCycleId);
        } else {
            revert("Reverting receiver");
        }
    }
}
