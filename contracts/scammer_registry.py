# v0.3.0
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

def _addr_str(addr: Address) -> str:
    try:
        s = addr.as_hex
    except Exception:
        s = str(addr)
    return s.lower()

def _canon_hash(h: str) -> str:
    return (h or "").strip().lower()

class Contract(gl.Contract):
    statuses: TreeMap[str, ProfileStatus]
    watchers: TreeMap[str, DynArray[Address]]
    all_profile_hashes: DynArray[str]
    profile_seen: TreeMap[str, bool]
    verdict_histogram: TreeMap[str, u32]

    core: Address
    admin: Address

    def __init__(self):
        self.admin = _to_address(gl.message.sender_address)

    def _require_admin(self) -> None:
        if _addr_str(_to_address(gl.message.sender_address)) != _addr_str(self.admin):
            raise gl.vm.UserError("admin only")

    def _require_core(self) -> None:
        if _addr_str(_to_address(gl.message.sender_address)) != _addr_str(self.core):
            raise gl.vm.UserError("only core contract")

    @gl.public.write
    def set_core(self, core_addr: Address) -> None:
        self._require_admin()
        self.core = _to_address(core_addr)

    @gl.public.write
    def set_admin(self, new_admin: Address) -> None:
        self._require_admin()
        self.admin = _to_address(new_admin)

    @gl.public.write
    def upsert_status(self, profile_hash: str, verdict_label: str, confidence: u8) -> None:
        self._require_core()
        key = _canon_hash(profile_hash)
        if len(key) == 0:
            raise gl.vm.UserError("profile_hash required")

        cur = self.statuses.get(key, None)
        if cur is None:
            self.statuses[key] = ProfileStatus(
                verdict_label=verdict_label,
                highest_confidence=confidence,
                case_count=u32(1),
                last_updated=bigint(gl.block.timestamp),
            )
            if not self.profile_seen.get(key, False):
                self.all_profile_hashes.append(key)
                self.profile_seen[key] = True
        else:
            conf_int = int(confidence)
            cur_conf_int = int(cur.highest_confidence)
            new_conf = max(cur_conf_int, conf_int)
            new_label = verdict_label if conf_int >= cur_conf_int else cur.verdict_label
            self.statuses[key] = ProfileStatus(
                verdict_label=new_label,
                highest_confidence=u8(new_conf),
                case_count=u32(int(cur.case_count) + 1),
                last_updated=bigint(gl.block.timestamp),
            )

    @gl.public.write
    def bump_histogram(self, verdict_label: str) -> None:
        self._require_core()
        prev = self.verdict_histogram.get(verdict_label, u32(0))
        self.verdict_histogram[verdict_label] = u32(int(prev) + 1)

    @gl.public.write
    def subscribe_watcher(self, profile_hash: str, watcher: Address) -> None:
        self._require_core()

        key = _canon_hash(profile_hash)
        if len(key) == 0:
            raise gl.vm.UserError("profile_hash required")
        arr = self.watchers.get(key, gl.storage.inmem_allocate(DynArray[Address]))
        w = _to_address(watcher)
        w_key = _addr_str(w)
        # dedupe - do not re-add the same watcher
        for i in range(len(arr)):
            if _addr_str(arr[i]) == w_key:
                return
        arr.append(w)
        self.watchers[key] = arr

    @gl.public.write
    def unsubscribe_watcher(self, profile_hash: str, watcher: Address) -> None:
        self._require_core()
        key = _canon_hash(profile_hash)
        if len(key) == 0:
            raise gl.vm.UserError("profile_hash required")
        arr = self.watchers.get(key, gl.storage.inmem_allocate(DynArray[Address]))
        w_key = _addr_str(_to_address(watcher))
        new_arr = gl.storage.inmem_allocate(DynArray[Address])
        removed = False
        for i in range(len(arr)):
            if _addr_str(arr[i]) == w_key and not removed:
                removed = True
                continue
            new_arr.append(arr[i])
        if removed:
            self.watchers[key] = new_arr

    @gl.public.view
    def get_status(self, profile_hash: str) -> ProfileStatus:
        return self.statuses.get(_canon_hash(profile_hash), ProfileStatus(
            verdict_label="UNKNOWN",
            highest_confidence=u8(0),
            case_count=u32(0),
            last_updated=bigint(0),
        ))

    @gl.public.view
    def get_watcher_count(self, profile_hash: str) -> u32:
        arr = self.watchers.get(_canon_hash(profile_hash), gl.storage.inmem_allocate(DynArray[Address]))
        return u32(len(arr))

    @gl.public.view
    def is_watching(self, profile_hash: str, watcher: Address) -> bool:
        arr = self.watchers.get(_canon_hash(profile_hash), gl.storage.inmem_allocate(DynArray[Address]))
        w_key = _addr_str(_to_address(watcher))
        for i in range(len(arr)):
            if _addr_str(arr[i]) == w_key:
                return True
        return False

    @gl.public.view
    def get_total_profiles(self) -> u32:
        return u32(len(self.all_profile_hashes))

    @gl.public.view
    def get_verdict_count(self, label: str) -> u32:
        return self.verdict_histogram.get(label, u32(0))

    @gl.public.view
    def list_profile_hashes(self, offset: u32, limit: u32) -> DynArray[str]:
        out = gl.storage.inmem_allocate(DynArray[str])
        total = len(self.all_profile_hashes)
        off = max(0, int(offset))
        lim = max(0, min(200, int(limit)))
        if total == 0 or lim == 0:
            return out
        end = total - off
        start = max(0, end - lim)
        for i in range(end - 1, start - 1, -1):
            if 0 <= i < total:
                out.append(self.all_profile_hashes[i])
        return out
