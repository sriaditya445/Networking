# repositories/user_repository.py

from bson import ObjectId
from app.core.database import get_db

class UserRepository:

    @staticmethod
    def collection():
        return get_db().users

    @staticmethod
    async def create(user_doc: dict):
        return await UserRepository.collection().insert_one(
            user_doc
        )

    @staticmethod
    async def get_by_id(user_id: str):
        return await UserRepository.collection().find_one(
            {
                "_id": ObjectId(user_id)
            }
        )

    @staticmethod
    async def get_by_username(username: str):
        return await UserRepository.collection().find_one(
            {
                "username": username
            }
        )

    @staticmethod
    async def get_all():
        return await UserRepository.collection().find(
            {}
        ).to_list(100)
    
    @staticmethod
    async def get_by_ids(
        user_ids: list[str]
    ):

        users = await (
            UserRepository.collection()
            .find(
                {
                    "_id": {
                        "$in": [
                            ObjectId(uid)
                            for uid in user_ids
                        ]
                    }
                }
            )
            .to_list(None)
        )

        return {
            str(user["_id"]): user
            for user in users
        }