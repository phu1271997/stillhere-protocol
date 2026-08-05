# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

from dataclasses import dataclass

import typing

@allow_storage
@dataclass
class ProfileStatus:
    verdict_label: str
    highest_confidence: u8
    case_count: u32
    last_updated: bigint

def _to_address(val: typing.Any) -> Address:
    if isinstance(val, Address):
        return val
    if isinstance(val, int):
        return Address(hex(val))
    return Address(str(val))

class Contract(gl.Contract):
    statuses: TreeMap[str, ProfileStatus]
    watchers: TreeMap[str, DynArray[Address]]
    core: Address
    admin: Address

    def __init__(self):
        self.admin = _to_address(gl.message.sender_address)

    @gl.public.write
    def set_core(self, core_addr: Address) -> None:
        if _to_address(gl.message.sender_address) != self.admin:
            raise gl.vm.UserError("only admin can set core address")
        self.core = _to_address(core_addr)

    @gl.public.write
    def upsert_status(self, profile_hash: str, verdict_label: str, confidence: u8) -> None:
        if _to_address(gl.message.sender_address) != self.core:
            raise gl.vm.UserError("only core contract can update status")

        cur = self.statuses.get(profile_hash, None)
        if cur is None:
            self.statuses[profile_hash] = ProfileStatus(
                verdict_label=verdict_label,
                highest_confidence=confidence,
                case_count=u32(1),
                last_updated=bigint(gl.block.timestamp),
            )
        else:
            conf_int = int(confidence)
            cur_conf_int = int(cur.highest_confidence)
            new_conf = max(cur_conf_int, conf_int)
            new_label = verdict_label if conf_int >= cur_conf_int else cur.verdict_label
            self.statuses[profile_hash] = ProfileStatus(
                verdict_label=new_label,
                highest_confidence=u8(new_conf),
                case_count=u32(int(cur.case_count) + 1),
                last_updated=bigint(gl.block.timestamp),
            )

    @gl.public.write
    def subscribe_watcher(self, profile_hash: str, watcher: Address) -> None:
        if _to_address(gl.message.sender_address) != self.core:
            raise gl.vm.UserError("only core contract can add watcher")

        arr = self.watchers.get(profile_hash, DynArray[Address]())
        arr.append(_to_address(watcher))
        self.watchers[profile_hash] = arr

    @gl.public.view
    def get_status(self, profile_hash: str) -> ProfileStatus:
        return self.statuses.get(profile_hash, ProfileStatus(
            verdict_label="UNKNOWN",
            highest_confidence=u8(0),
            case_count=u32(0),
            last_updated=bigint(0),
        ))
