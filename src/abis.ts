export const biconomyForwarderAbi = [{ inputs: [{ internalType: 'address', name: '_owner', type: 'address' }], stateMutability: 'nonpayable', type: 'constructor' }, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32',
  }, {
    indexed: false, internalType: 'bytes', name: 'domainValue', type: 'bytes',
  }],
  name: 'DomainRegistered',
  type: 'event',
}, {
  anonymous: false,
  inputs: [{
    indexed: true, internalType: 'address', name: 'previousOwner', type: 'address',
  }, {
    indexed: true, internalType: 'address', name: 'newOwner', type: 'address',
  }],
  name: 'OwnershipTransferred',
  type: 'event',
}, {
  inputs: [], name: 'EIP712_DOMAIN_TYPE', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'REQUEST_TYPEHASH', outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }], name: 'domains', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executeEIP712',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'executePersonalSign',
  outputs: [{ internalType: 'bool', name: 'success', type: 'bool' }, { internalType: 'bytes', name: 'ret', type: 'bytes' }],
  stateMutability: 'nonpayable',
  type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }], name: 'getNonce', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'isOwner', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'owner', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [{ internalType: 'string', name: 'name', type: 'string' }, { internalType: 'string', name: 'version', type: 'string' }], name: 'registerDomainSeparator', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [], name: 'renounceOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }], name: 'transferOwnership', outputs: [], stateMutability: 'nonpayable', type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes32', name: 'domainSeparator', type: 'bytes32' }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyEIP712',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}, {
  inputs: [{
    components: [{ internalType: 'address', name: 'from', type: 'address' }, { internalType: 'address', name: 'to', type: 'address' }, { internalType: 'address', name: 'token', type: 'address' }, { internalType: 'uint256', name: 'txGas', type: 'uint256' }, { internalType: 'uint256', name: 'tokenGasPrice', type: 'uint256' }, { internalType: 'uint256', name: 'batchId', type: 'uint256' }, { internalType: 'uint256', name: 'batchNonce', type: 'uint256' }, { internalType: 'uint256', name: 'deadline', type: 'uint256' }, { internalType: 'bytes', name: 'data', type: 'bytes' }], internalType: 'structERC20ForwardRequestTypes.ERC20ForwardRequest', name: 'req', type: 'tuple',
  }, { internalType: 'bytes', name: 'sig', type: 'bytes' }],
  name: 'verifyPersonalSign',
  outputs: [],
  stateMutability: 'view',
  type: 'function',
}];
export const eip2771BaseAbi = [{
  inputs: [{ internalType: 'address', name: 'forwarder', type: 'address' }], name: 'isTrustedForwarder', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function',
}, {
  inputs: [], name: 'trustedForwarder', outputs: [{ internalType: 'address', name: '', type: 'address' }], stateMutability: 'view', type: 'function',
}];
