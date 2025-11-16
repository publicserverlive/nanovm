# NanoVM

Demo: https://publicserverlive.github.io/nanovm/

## 1. Information Theory

NanoVM is an exploration of using Nano as a **message and computation layer**, rather than trying to turn Nano itself into a full smart contract or privacy coin. The core ideas are:

- **Information-theoretic capacity of Nano amounts**  
  Each Nano transaction supports up to 30 decimal places in the amount field. Treating those 30 digits as base-10 symbols gives:
  - Total states per amount: \(10^{30}\)
  - Information capacity: \(30 \cdot \log_2 10 \approx 99.66\) bits
  This is a high-bandwidth, feeless spam resistant globally replicated data channel embedded in every spend.

- **Nano as a shared append-only log, clients as interpreters**  
  The blockchain stores a linear, immutable sequence of values. Client software reads this log, interprets messages according to a shared specification, and produces effects (local state changes, potentially new Nano transactions and external actions).

- **Client-side deterministic computation**  
  All computation happens in clients, but in a **verifiably deterministic** way: given the same transcript of on-chain messages and the same VM specification, every honest client computes the same result. Nano serves as a public, tamper-evident log of inputs and state commitments.

- **BitVM-inspired verification without Bitcoin**  
  BitVM shows how to verify arbitrary computations by committing to an execution trace and enabling fraud proofs. NanoVM adapts the philosophy:
  - Use Nano only as a **data and transcript layer**.
  - Clients commit to program, inputs, and execution traces via hashes and Merkle roots stored in Nano decimals.
  - Anyone can recompute and verify consistency from the transcript.
  - There is **no on-chain slashing** on Nano; enforcement is social, contractual, or via higher-level protocols.

NanoVM does not change Nano consensus. It overlays a virtual machine and protocol conventions on top of existing transactions.

---

## 2. Mechanism on Nano

Nano provides:

- **Feeless, high-frequency sends** for fine-grained state updates.
- **Globally ordered, immutable history** per account chain, with timestamps.
- **30 decimal digits** per amount, usable as a compact data field.

NanoVM treats each relevant transaction as a **message** of the form:

```text
[program_id]   // hash of VM code/spec
[session_id]   // instance identifier
[version/seq]  // monotonic sequence or version number
[payload]      // arbitrary structured data
```

These fields are serialized to bytes and then packed into the 30-decimal field of one or more Nano amounts.
These can be sent to the originating account, incuring no loss of funds.

### Programs as interactive transcripts

A NanoVM "program" is not executed inside the Nano consensus. Instead:

- A **program account** publishes messages that define and update program state.
- Messages from that account are considered **authoritative and trusted** (by configuration or policy in clients).
- Later messages with higher `version` or special flags can **supersede** or **invalidate** earlier ones, even though the old ones remain on-chain.

Clients reconstruct the current state by:

1. Reading all messages for `(program_id, session_id)`.  
2. Validating signatures and basic structure.  
3. Applying a deterministic rule like "latest valid version wins" or following explicit supersede links.

This yields a mutable logical state backed by an immutable log.

### Ephemeral accounts and program-controlled flows

Using NanoVM messages, a program can instruct clients to:

- **Generate new random accounts** locally (private keys never on-chain).
- **Fund those accounts** with regular Nano sends.
- **Spend from those accounts** according to program-defined rules (time locks, conditions, off-chain agreements).

From the chain's perspective, these are normal transactions. From NanoVM-aware clients' perspective, they are part of a higher-level program.

---

## 3. Encoding & Decoding

### Base-99 packing into 30 decimals

NanoVM uses a near-optimal encoding scheme implemented in `converter.js`:

- Arbitrary bytes are prefixed with an 8-byte header:
  - `"NVM1"` magic (4 bytes).
  - Original payload length as a 4-byte big-endian integer.
- The header + payload bytes are interpreted as a big-endian integer `V`.
- `V` is converted into base-99 digits (values `0..98`).
- Digits are grouped into chunks of 15 digits per transaction:
  - Each digit `d` is written as a 2-digit decimal string `d.toString().padStart(2, '0')`.
  - 15 digits → 30 decimal characters → one Nano amount like `0.010298...`.
  - `99` is reserved as a **padding digit** and encoded as `"99"`.

This achieves ~99.4 bits of payload per 30-decimal amount, very close to the theoretical 99.66-bit maximum.

NanoVM enables a variety of higher-layer constructs without modifying Nano itself.

### Client-side deterministic computation

- Use Nano as a global log of inputs, configurations, and state commitments.
- Define a deterministic VM or rule set (the "NanoVM" interpreter) in clients.
- Given the same Nano transcript, every honest client computes the same outputs and state.

Applications:

- Off-chain rollup-like state machines with state roots committed on Nano.
- Deterministic oracles and data feeds: rules + inputs + outputs all recorded; anyone can recompute.
- Interactive protocols (games, auctions, governance) where legality and outcomes are verifiable by replaying the transcript.

### Encrypt and hide data

- Encrypt program instructions, state, and messages before encoding them into decimals.  
  Only clients with the keys can interpret the log entries; on-chain data looks random.

### Verifiable attestations and reputation

- Encode attestations ("key A vouches for key B", credentials, properties) as NanoVM messages.
- Clients reconstruct an attestation graph and apply deterministic scoring rules to derive reputation.

### Interactive, revocable programs

- A trusted program account continuously publishes updated state/configuration messages.
- Each message includes `program_id`, `session_id`, and a monotonically increasing `version`.

---

## 5. Future Potential: "Virtual Nano"

"Virtual Nano" is a conceptual hyper-layer coin or asset model that sits **on top of Nano**, inspired by burning and re-minting semantics:

- **Burn-as-commit**  
  Users may send Nano to special burn or sink addresses while simultaneously publishing NanoVM messages that define a corresponding amount of "Virtual Nano" in the hyper layer. The burn transaction + encoded message together attest to the creation of a virtual asset unit.

- **Virtual Nano ledger in clients**  
  Clients track a separate ledger of "Virtual Nano" balances and state, driven entirely by NanoVM messages. Operations include:
  - Transfers of Virtual Nano between parties.
  - Complex conditions and programs governing Virtual Nano flows.
  - Optional zk shielding or privacy features.


## 6. Conclusion

NanoVM is a framework for treating Nano as a **high-bandwidth, globally ordered data and computation bus**. By encoding arbitrary programs and state transitions into the 30-decimal amount field, and by agreeing on deterministic client-side interpreters, it becomes possible to build:

- Verifiable off-chain computation and protocols.
- Privacy-preserving applications (at the data and computation layer).
- Identity, reputation, and governance primitives.
- Experimental higher-layer assets like "Virtual Nano" backed by burns or other conventions.

All of this works **without any change to Nano consensus**, relying instead on:

- The information capacity of transaction decimals.
- Immutable, globally available history.
- Deterministic rules implemented in clients that treat Nano transactions as entries in a shared log and act as interpreters of a new computational layer.

## 7. Roadmap

- Deploy first encoded message
- Deploy first image
- demo web wallet or explorer to walk program accounts for assets.


Further reading and inspiration:

* BitVm: https://github.com/BitVm/BitVm
* Deterministic VMs: https://github.com/AluVM/aluvm-spec
* Virtual Nano: Dr Maxim Orlovsky: Prime - New Layer 1 for Bitcoin https://youtu.be/vHsAJXSpfzU

Thank you for reading! If you find this interesting, please consider supporting my work on Nano: nano_1i5kzrcodkab1rcrzu4scasd5zatkyixtcwmg49re5b95tihnkrxgd3tjah7