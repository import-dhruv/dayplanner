from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Category, Project, Tag, UserPreference
from ..schemas import (
    CategoryIn,
    CategoryOut,
    PreferenceIn,
    PreferenceOut,
    ProjectIn,
    ProjectOut,
    TagIn,
    TagOut,
)

router = APIRouter(tags=["catalog"])


# ---------------- Categories ----------------
@router.get("/api/categories", response_model=list[CategoryOut])
def list_categories(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Category).filter(Category.user_id == user.id).order_by(Category.sort_order, Category.id).all()


@router.post("/api/categories", response_model=CategoryOut, status_code=201)
def create_category(payload: CategoryIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, "Category name required")
    count = db.query(Category).filter(Category.user_id == user.id).count()
    cat = Category(
        user_id=user.id,
        name=payload.name.strip(),
        color=payload.color or "#7C6CF0",
        icon=payload.icon or "Circle",
        sort_order=payload.sort_order if payload.sort_order is not None else count,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/api/categories/{category_id}", response_model=CategoryOut)
def patch_category(category_id: int, payload: CategoryIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user.id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.post("/api/categories/reorder", status_code=204)
def reorder_categories(payload: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    ids = payload.get("ids") or []
    for index, cid in enumerate(ids):
        cat = db.query(Category).filter(Category.id == cid, Category.user_id == user.id).first()
        if cat:
            cat.sort_order = index
    db.commit()


@router.delete("/api/categories/{category_id}", status_code=204)
def delete_category(category_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id, Category.user_id == user.id).first()
    if not cat:
        raise HTTPException(404, "Category not found")
    db.delete(cat)
    db.commit()


# ---------------- Projects ----------------
@router.get("/api/projects", response_model=list[ProjectOut])
def list_projects(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.user_id == user.id).order_by(Project.sort_order, Project.id).all()


@router.post("/api/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, "Project name required")
    count = db.query(Project).filter(Project.user_id == user.id).count()
    project = Project(user_id=user.id, name=payload.name.strip())
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        if value is not None:
            setattr(project, key, value)
    project.sort_order = payload.sort_order if payload.sort_order is not None else count
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/api/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.patch("/api/projects/{project_id}", response_model=ProjectOut)
def patch_project(project_id: int, payload: ProjectIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/api/projects/{project_id}", status_code=204)
def delete_project(project_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    db.delete(project)
    db.commit()


# ---------------- Tags ----------------
@router.get("/api/tags", response_model=list[TagOut])
def list_tags(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Tag).filter(Tag.user_id == user.id).order_by(Tag.id).all()


@router.post("/api/tags", response_model=TagOut, status_code=201)
def create_tag(payload: TagIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(400, "Tag name required")
    existing = db.query(Tag).filter(Tag.user_id == user.id, Tag.name == payload.name.strip()).first()
    if existing:
        return existing
    tag = Tag(user_id=user.id, name=payload.name.strip(), color=payload.color or "#94A3B8")
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/api/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id, Tag.user_id == user.id).first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()


# ---------------- Preferences ----------------
@router.get("/api/preferences", response_model=PreferenceOut)
def get_preferences(user=Depends(get_current_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not prefs:
        prefs = UserPreference(user_id=user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.patch("/api/preferences", response_model=PreferenceOut)
def patch_preferences(payload: PreferenceIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not prefs:
        prefs = UserPreference(user_id=user.id)
        db.add(prefs)
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(prefs, key, value)
    db.commit()
    db.refresh(prefs)
    return prefs
