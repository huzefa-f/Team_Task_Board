"""
Seeds the database with demo accounts and a sample project, so reviewers
can log in and explore the app without going through signup.

Run with: python seed.py
"""
from database import SessionLocal
from models import User, Project, ProjectMember, RoleEnum
from auth import hash_password

def seed():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.email == "huzefafakhar10@gmail.com").first()
        if not admin:
            admin = User(
                email="huzefafakhar10@gmail.com",
                name="Huzefa Fakhar",
                hashed_password=hash_password("huze2002"),
            )
            db.add(admin)
            db.flush()
            print(f"Created admin user: {admin.email}")
        else:
            print(f"Admin user already exists: {admin.email}")

        member = db.query(User).filter(User.email == "ms@test.com").first()
        if not member:
            member = User(
                email="ms@test.com",
                name="Martin Smith",
                hashed_password=hash_password("member123"),
            )
            db.add(member)
            db.flush()
            print(f"Created member user: {member.email}")
        else:
            print(f"Member user already exists: {member.email}")

        project = db.query(Project).filter(Project.name == "Website Redesign").first()
        if not project:
            project = Project(name="Website Redesign", owner_id=admin.id)
            db.add(project)
            db.flush()
            print(f"Created demo project: {project.name}")

            db.add(ProjectMember(project_id=project.id, user_id=admin.id, role=RoleEnum.admin))
            db.add(ProjectMember(project_id=project.id, user_id=member.id, role=RoleEnum.member))
            print("Added both users as project members")
        else:
            print(f"Demo project already exists: {project.name}")

        db.commit()
        print("Seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()