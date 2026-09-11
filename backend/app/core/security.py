import hashlib
import secrets

from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()
# Equal-cost password verification for unknown accounts.
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(32))


def token_digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(48)
