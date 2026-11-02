#!/usr/bin/env python3
"""
LearnAI Administrative CLI Tool
Securely manages administrator accounts, passwords, and allowlist verification.
Uses the project's existing Argon2id password hashing mechanism.
Never logs or prints plaintext passwords, hashes, or sensitive tokens.
"""

import sys
import os
import argparse
import getpass
from pathlib import Path

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password, verify_password
from app.models.entities import Student


def get_db_session():
    return SessionLocal()


def cmd_list(args):
    """List configured administrator accounts and their database presence."""
    db = get_db_session()
    try:
        configured_emails = settings.ADMIN_EMAILS
        print("=" * 70)
        print("LearnAI Configured Administrators (Server-Side Allowlist)")
        print("=" * 70)
        print(f"Server-Side ADMIN_EMAILS: {', '.join(configured_emails) if configured_emails else 'None configured'}\n")
        
        print(f"{'Email':<35} {'Account Exists':<16} {'Password Set':<14} {'Admin Role':<12}")
        print("-" * 77)

        for email in configured_emails:
            student = db.query(Student).filter(Student.email == email.lower()).first()
            if student:
                has_pwd = "Yes" if student.hashed_password else "No (OAuth)"
                is_adm = "Yes" if student.is_admin_user else "No"
                print(f"{student.email:<35} {'Yes (ID: ' + str(student.id) + ')':<16} {has_pwd:<14} {is_adm:<12}")
            else:
                print(f"{email:<35} {'No':<16} {'No':<14} {'Pending Setup':<12}")
        print("=" * 70)
    finally:
        db.close()


def cmd_set_password(args):
    """Securely updates the password for an administrator account."""
    email = args.email.strip().lower()
    db = get_db_session()
    try:
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            print(f"[ERROR] No user found with email: {email}")
            print(f"Hint: Use 'python manage_admin.py create --email {email}' to initialize this administrator.")
            sys.exit(1)

        password = args.password
        if not password:
            password = getpass.getpass(f"Enter new password for [{email}]: ")
            confirm = getpass.getpass("Confirm new password: ")
            if password != confirm:
                print("[ERROR] Passwords do not match. Aborting.")
                sys.exit(1)

        if len(password) < 6:
            print("[ERROR] Password must be at least 6 characters long.")
            sys.exit(1)

        # Hash with Argon2id using project's security module
        student.hashed_password = hash_password(password)
        student.role = "admin"
        student.is_admin = True
        student.is_onboarded = True
        db.commit()

        print(f"[SUCCESS] Password for '{email}' successfully updated.")

        # Check if email is in ADMIN_EMAILS
        if not settings.is_admin_email(email):
            print(f"\n[WARNING] '{email}' is NOT currently in the server-side ADMIN_EMAILS allowlist!")
            print(f"To grant full console access, add this email to your .env file:")
            print(f"ADMIN_EMAILS={','.join(settings.ADMIN_EMAILS + [email])}")
        else:
            print(f"[SUCCESS] Verified in server-side ADMIN_EMAILS allowlist.")
    finally:
        db.close()


def cmd_create(args):
    """Creates a new administrator account with a hashed password."""
    email = args.email.strip().lower()
    name = args.name.strip() if args.name else "Platform Administrator"
    db = get_db_session()
    try:
        existing = db.query(Student).filter(Student.email == email).first()
        if existing:
            print(f"[INFO] User '{email}' already exists (ID: {existing.id}). Updating to administrator...")
            existing.role = "admin"
            existing.is_admin = True
            existing.name = name or existing.name
            target_student = existing
        else:
            target_student = Student(
                name=name,
                email=email,
                auth_provider="local",
                role="admin",
                is_admin=True,
                is_onboarded=True,
                department="System Administration",
                year="Staff",
                semester="Staff"
            )
            db.add(target_student)

        password = args.password
        if not password:
            password = getpass.getpass(f"Enter password for new administrator [{email}]: ")
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                print("[ERROR] Passwords do not match. Aborting.")
                sys.exit(1)

        if len(password) < 6:
            print("[ERROR] Password must be at least 6 characters long.")
            sys.exit(1)

        target_student.hashed_password = hash_password(password)
        db.commit()
        db.refresh(target_student)

        print(f"[SUCCESS] Administrator account '{email}' (ID: {target_student.id}) is ready.")

        if not settings.is_admin_email(email):
            print(f"\n[ACTION REQUIRED] '{email}' is NOT yet in your server-side ADMIN_EMAILS allowlist.")
            print(f"Add it to your .env file:")
            print(f"  ADMIN_EMAILS={','.join(settings.ADMIN_EMAILS + [email])}")
        else:
            print(f"[SUCCESS] Server-side ADMIN_EMAILS allowlist verified.")
    finally:
        db.close()


def cmd_verify(args):
    """Safely verifies login eligibility and password matching without leaking secrets."""
    email = args.email.strip().lower()
    db = get_db_session()
    try:
        print(f"--- Verifying Administrator Login Eligibility for [{email}] ---")
        
        # Check 1: Server Allowlist
        in_allowlist = settings.is_admin_email(email)
        status_allowlist = "PASS (Authorized in ADMIN_EMAILS)" if in_allowlist else "FAIL (Not in ADMIN_EMAILS)"
        print(f"1. Server Allowlist Check : {status_allowlist}")

        # Check 2: Database Account
        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            print(f"2. Database Account Check : FAIL (User record does not exist)")
            print(f"3. Password Hash Check    : FAIL (No record)")
            print(f"4. Password Verification  : SKIPPED")
            return

        status_acc = f"PASS (Account exists with ID: {student.id}, role={student.role}, is_admin={student.is_admin})"
        print(f"2. Database Account Check : {status_acc}")

        # Check 3: Hash Exists
        has_hash = bool(student.hashed_password)
        status_hash = "PASS (Valid password hash present)" if has_hash else "FAIL (No password hash set)"
        print(f"3. Password Hash Check    : {status_hash}")

        if not has_hash:
            return

        # Check 4: Test Password Matching
        password = args.password
        if not password:
            password = getpass.getpass(f"Enter password to test against stored hash: ")

        matches = verify_password(password, student.hashed_password)
        status_match = "PASS (Password matches hash successfully)" if matches else "FAIL (Invalid password)"
        print(f"4. Password Verification  : {status_match}")

        print("-" * 60)
        if in_allowlist and matches and student.is_admin_user:
            print("OVERALL RESULT: READY FOR ADMIN LOGIN (200 OK)")
        elif not in_allowlist and matches:
            print("OVERALL RESULT: ACCESS DENIED (403 Forbidden - Not in ADMIN_EMAILS)")
        else:
            print("OVERALL RESULT: AUTHENTICATION FAILED (401 Unauthorized - Invalid credentials)")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="LearnAI Administrator Management CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # list
    subparsers.add_parser("list", help="List configured admin emails and account status")

    # set-password
    p_set = subparsers.add_parser("set-password", help="Update password for an existing administrator")
    p_set.add_argument("--email", required=True, help="Institutional admin email address")
    p_set.add_argument("--password", required=False, help="New password (if omitted, prompts securely)")

    # create
    p_create = subparsers.add_parser("create", help="Create or bootstrap a new administrator account")
    p_create.add_argument("--email", required=True, help="Institutional admin email address")
    p_create.add_argument("--name", required=False, default="Platform Administrator", help="Display name")
    p_create.add_argument("--password", required=False, help="Admin password (if omitted, prompts securely)")

    # verify
    p_verify = subparsers.add_parser("verify", help="Verify administrator credentials and authorization")
    p_verify.add_argument("--email", required=True, help="Admin email address to verify")
    p_verify.add_argument("--password", required=False, help="Password to verify against stored hash")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "list":
        cmd_list(args)
    elif args.command == "set-password":
        cmd_set_password(args)
    elif args.command == "create":
        cmd_create(args)
    elif args.command == "verify":
        cmd_verify(args)


if __name__ == "__main__":
    main()
