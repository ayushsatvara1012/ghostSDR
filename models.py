import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, Enum, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()

# --- 1. Subscriptions & Tenancy ---
class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class User(Base):
    __tablename__ = "users"
    
    # Using UUIDs is critical for multi-tenant SaaS security
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False) # Or Auth0/Clerk ID
    
    # Billing & Usage
    stripe_customer_id = Column(String, unique=True, nullable=True)
    tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    api_credits = Column(Integer, default=50) # Deduct 1 per lead generated
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sdr_profiles = relationship("SDRProfile", back_populates="user", cascade="all, delete-orphan")
    campaigns = relationship("Campaign", back_populates="user", cascade="all, delete-orphan")

# --- 2. The Custom AI "Brain" Context ---
class SDRProfile(Base):
    """Stores the specific business context for the AI to inject into its prompt."""
    __tablename__ = "sdr_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    company_name = Column(String, nullable=False)
    value_proposition = Column(Text, nullable=False) # e.g. "We reduce AWS cloud bills by 30%"
    target_audience = Column(Text, nullable=False)   # e.g. "CTOs and DevOps Leads"
    tone_of_voice = Column(String, default="Professional, direct, and highly technical")
    
    user = relationship("User", back_populates="sdr_profiles")

# --- 3. The Search History ---
class Campaign(Base):
    """Groups leads together from a single 'Hunt'."""
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    search_query = Column(String, nullable=False) # e.g. "VP Engineering New York hiring React"
    status = Column(String, default="completed") # pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign", cascade="all, delete-orphan")

# --- 4. The Qualified Leads ---
class LeadStatus(str, enum.Enum):
    DRAFTED = "drafted"
    EMAILED = "emailed"
    REPLIED = "replied"
    TRASH = "trash"

class Lead(Base):
    """The actual extracted targets and their AI insights."""
    __tablename__ = "leads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    
    full_name = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=True)
    headline = Column(Text, nullable=True)
    
    # AI Generated Outputs
    relevance_score = Column(Integer, nullable=False)
    suggested_opening_line = Column(Text, nullable=False)
    
    # Postgres JSONB is perfect here. Instead of making a separate table for triggers,
    # we just dump the array of JSON triggers Claude generated straight into this column.
    key_insights = Column(JSONB, nullable=False) 
    
    status = Column(Enum(LeadStatus), default=LeadStatus.DRAFTED)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    campaign = relationship("Campaign", back_populates="leads")