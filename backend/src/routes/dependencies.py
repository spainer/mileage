from litestar.di import NamedDependency
from litestar.params import FromPath
from sqlalchemy.ext.asyncio import AsyncSession

Session = NamedDependency[AsyncSession]
CarId = FromPath[int]
