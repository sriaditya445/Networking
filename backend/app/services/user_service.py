# services/user_service.py

from bson import ObjectId

from app.repositories.user_repository import (
    UserRepository
)
from datetime import datetime


class UserService:

    SYSTEM_USERNAME = "system"

    @staticmethod
    async def create_system_user():

        existing = await UserRepository.get_by_username(
            "system"
        )

        if existing:
            return existing

        await UserRepository.create(
            {
                "username": "system",
                "email": "system@localhost",
                "role": "system",
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )

    @staticmethod
    async def get_user(user_id: str):
        return await UserRepository.get_by_id(
            user_id
        )

    @staticmethod
    async def get_username(user_id: str):

        user = await UserRepository.get_by_id(
            user_id
        )

        if not user:
            return None

        return user["username"]

    @staticmethod
    async def get_system_user():

        return await UserRepository.get_by_username(
            UserService.SYSTEM_USERNAME
        )

    @staticmethod
    async def get_system_user_id():

        user = await UserService.get_system_user()

        return str(user["_id"])
    
    @staticmethod
    async def get_users_map(
        user_ids: list[str]
    ):

        users = await UserRepository.get_by_ids(
            user_ids
        )

        return {
            user_id: user["username"]
            for user_id, user in users.items()
        }