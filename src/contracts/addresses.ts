import type { Address } from 'viem'

/**
 * Deployment addresses, keyed by chain id.
 * Source: D:/gh-projects/token-launchpad-contracts/script/deployments/{56,97}.json
 * @ 3e04354 + 97.json working tree (2026-09-21 testnet redeploy)
 *
 * 56 = BSC mainnet, 97 = BSC testnet.
 */
export const addresses = {
  56: {
    flapTaxTokenImplementation: '0xd7E12EcD6406B993D94F0bC67A4a62681F50AA99',
    tokenFactory: '0x04556cBC53C9E994522b008B676958e715545564',
    presaleImplementation: '0x6b51064d62018DE9832590f1788078BdFB64ACa5',
    presaleFactory: '0x7A6B4da821F4b2aDB1432E06E7B7aD2f20972A1A',
    coordinatorFactory: '0xc7284f96716E4FbB3F794CB407D882C29aA653B1',
  },
  97: {
    flapTaxTokenImplementation: '0x74919901380297e0294dcd206B9C1E934e7026da',
    tokenFactory: '0x084f90Eda0EE5fd0075159feBE44bcCa3dE1f083',
    presaleImplementation: '0x22a55bEe1F079ecf021347575599C5dCf96FE751',
    presaleFactory: '0x41Bc35F1e4b86d2230CDa129ae42D57968E4fe79',
    coordinatorFactory: '0x8b678ed56926B975C9d926bE12778d9F17e479C1',
    buybackVaultImplementation: '0xa5C7A00C3A96A0E787a1c751071F531A7C44e05b',
    buybackVaultFactory: '0xb8F45651205850DFfc5Ecb23EEffAAFb8A02CDcf',
  },
} as const satisfies Record<number, Record<string, Address>>

export type SupportedChainId = keyof typeof addresses
export type DeploymentAddresses = (typeof addresses)[SupportedChainId]
