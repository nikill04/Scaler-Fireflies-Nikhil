"""
seed.py
--------
Populates the database with realistic sample data so the app is usable
the moment it's started, without anyone needing to manually create meetings.

Run with:  python -m app.seed

This file is intentionally just plain Python data (lists of dicts) feeding
into the ORM models -- there's no cleverness here on purpose. If you need to
explain this file in an interview, the honest answer is: "this is mock data
that plays the role of what would normally come from a real transcription
+ LLM summarization pipeline."
"""

from datetime import datetime, timedelta, timezone

from app.database import engine, SessionLocal, Base
from app.models import (
    User, Meeting, Participant, TranscriptLine,
    Summary, SummaryKeyPoint, ActionItem, OutlineItem, Tag, MeetingTag
)


def seed():
    # Recreate all tables fresh every time we seed (fine for an assignment --
    # we want a clean, predictable demo state).
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # -----------------------------------------------------------------
    # 1) Default user (the "mocked auth" user, per assignment notes)
    # -----------------------------------------------------------------
    default_user = User(
        name="Nikhil Sharma",
        email="nikhil@example.com",
        avatar_url="https://api.dicebear.com/7.x/initials/svg?seed=Nikhil%20Sharma",
        role="Host",
    )
    db.add(default_user)
    db.commit()
    db.refresh(default_user)

    # -----------------------------------------------------------------
    # 2) Tags (created once, then attached to meetings via MeetingTag)
    # -----------------------------------------------------------------
    tag_names = ["Sales", "Product", "Standup", "Hiring", "Planning", "Client Call"]
    tags = {}
    for name in tag_names:
        t = Tag(name=name)
        db.add(t)
        tags[name] = t
    db.commit()

    now = datetime.now(timezone.utc)

    # -----------------------------------------------------------------
    # 3) Meeting definitions -- each one is a fully self-contained dict
    #    so it's easy to add a 5th/6th meeting later by copying the shape.
    # -----------------------------------------------------------------
    meetings_data = [
        {
            "title": "Q3 Product Roadmap Review",
            "days_ago": 1,
            "duration_seconds": 1860,  # 31 min
            "participants": ["Aditi Rao", "Marcus Lee", "Nikhil Sharma"],
            "tags": ["Product", "Planning"],
            "transcript": [
                ("Aditi Rao", 0, 14, "Alright, let's kick off the Q3 roadmap review. Marcus, do you want to start with the backend priorities?"),
                ("Marcus Lee", 14, 38, "Sure. The big one is migrating our search service to the new indexing pipeline. We estimate that's about three weeks of work."),
                ("Aditi Rao", 38, 55, "Three weeks feels long given everything else on the board. Can we parallelize any of it with the frontend work?"),
                ("Marcus Lee", 55, 80, "Some of it, yes. The API contract can be finalized in week one, so frontend can start integrating while we finish the indexing internals."),
                ("Nikhil Sharma", 80, 102, "That works for us. If we get the contract early, we can build the new search UI against mocked responses and swap it in later."),
                ("Aditi Rao", 102, 120, "Perfect, let's do that. Marcus, can you share the API contract draft by Wednesday?"),
                ("Marcus Lee", 120, 128, "Yes, I'll have it ready by Wednesday morning."),
                ("Aditi Rao", 128, 150, "Great. Next up, notifications. We've had a lot of support tickets about missed notifications on mobile."),
                ("Nikhil Sharma", 150, 178, "I looked into it. The issue is our push notification service silently drops messages when the payload exceeds a certain size. I have a fix ready."),
                ("Aditi Rao", 178, 190, "How long until that's in production?"),
                ("Nikhil Sharma", 190, 205, "It's a small change, I can ship it this week, probably Thursday after testing."),
                ("Aditi Rao", 205, 225, "Awesome, let's prioritize that since it's actively affecting users. Marcus, anything blocking you right now?"),
                ("Marcus Lee", 225, 248, "Just need sign-off on the database schema change for the indexing pipeline. I'll send it over after this call."),
                ("Aditi Rao", 248, 270, "Sounds good, I'll review it today. Let's also talk about the Q3 OKRs before we wrap up."),
                ("Nikhil Sharma", 270, 300, "For OKRs, I think we should commit to shipping the new search experience and fixing the notification reliability issue as our top two."),
                ("Aditi Rao", 300, 325, "Agreed. I'll draft the OKR doc and share it for comments by end of week. Let's reconvene next Monday to finalize."),
                ("Marcus Lee", 325, 335, "Sounds good, see everyone Monday."),
            ],
            "summary_overview": "The team reviewed Q3 product priorities, focusing on the search service migration and a critical mobile notification bug. Marcus will deliver the new search API contract by Wednesday so frontend work can start in parallel, while Nikhil will ship a fix for dropped push notifications by Thursday. The team agreed to set Q3 OKRs around these two efforts and will finalize them in next Monday's meeting.",
            "key_points": [
                "Search service migration to new indexing pipeline estimated at 3 weeks, with API contract ready by Wednesday to unblock frontend work.",
                "Mobile push notifications are being silently dropped for large payloads; fix is ready and will ship Thursday.",
                "Q3 OKRs will center on the new search experience and notification reliability.",
                "Database schema change for indexing pipeline needs sign-off from Aditi.",
            ],
            "action_items": [
                ("Share search API contract draft with the team", "Marcus Lee", False),
                ("Ship push notification payload-size fix to production", "Nikhil Sharma", False),
                ("Review and sign off on database schema change", "Aditi Rao", False),
                ("Draft Q3 OKR document and share for comments", "Aditi Rao", False),
            ],
            "outline": [
                ("Backend priorities & search migration", 0),
                ("Mobile notification bug discussion", 128),
                ("Blockers and schema sign-off", 225),
                ("Q3 OKR planning", 270),
            ],
        },
        {
            "title": "Daily Standup - Engineering",
            "days_ago": 0,
            "duration_seconds": 540,  # 9 min
            "participants": ["Nikhil Sharma", "Priya Menon", "Marcus Lee"],
            "tags": ["Standup"],
            "transcript": [
                ("Priya Menon", 0, 20, "I'll go first. Yesterday I finished the password reset flow and started on email verification. Today I'm continuing email verification, no blockers."),
                ("Nikhil Sharma", 20, 45, "Yesterday I fixed the notification payload bug we discussed and wrote tests for it. Today I'm starting on the search UI mockups using the new API contract. No blockers either."),
                ("Marcus Lee", 45, 70, "I finished the API contract draft for the search pipeline and started the database migration script. Today I'll keep working on the migration. One small blocker -- I need someone to review the schema change."),
                ("Priya Menon", 70, 80, "I can take a look at the schema change after standup."),
                ("Marcus Lee", 80, 86, "That would be great, thank you."),
                ("Nikhil Sharma", 86, 100, "Quick heads up, I'll be slightly late tomorrow, I have a dentist appointment in the morning."),
                ("Priya Menon", 100, 106, "Noted, thanks for the heads up."),
                ("Marcus Lee", 106, 118, "Alright, sounds like we're all unblocked or about to be. Let's keep going."),
            ],
            "summary_overview": "Quick engineering standup. Priya wrapped up the password reset flow and is moving to email verification. Nikhil resolved the notification bug from yesterday's roadmap meeting and is starting on search UI mockups. Marcus finished the API contract and started the database migration, with Priya volunteering to review the schema change.",
            "key_points": [
                "Priya finished password reset flow, now working on email verification.",
                "Nikhil fixed the notification bug and is starting search UI mockups.",
                "Marcus needs a schema review; Priya will handle it after standup.",
                "Nikhil will be slightly late tomorrow due to a dentist appointment.",
            ],
            "action_items": [
                ("Review database schema change for indexing pipeline", "Priya Menon", False),
                ("Continue email verification flow", "Priya Menon", False),
                ("Start search UI mockups using new API contract", "Nikhil Sharma", False),
            ],
            "outline": [
                ("Priya's update", 0),
                ("Nikhil's update", 20),
                ("Marcus's update & blocker", 45),
                ("Wrap-up notes", 86),
            ],
        },
        {
            "title": "Client Call - Initial Discovery (Brightside Retail)",
            "days_ago": 3,
            "duration_seconds": 2280,  # 38 min
            "participants": ["Nikhil Sharma", "Sarah Kim", "James Okafor"],
            "tags": ["Client Call", "Sales"],
            "transcript": [
                ("Sarah Kim", 0, 18, "Thanks for taking the time today. We're James and I from Brightside Retail, and we're exploring tools to help our team run meetings more efficiently."),
                ("Nikhil Sharma", 18, 40, "Happy to walk you through it. To start, can you tell me a bit about your current process and what's frustrating about it?"),
                ("James Okafor", 40, 70, "Right now everything is manual. Someone takes notes during the call, then types them up afterward, and half the time action items get lost in Slack messages."),
                ("Sarah Kim", 70, 90, "And nobody remembers who said what exactly, so when there's a disagreement about a decision later, we have no record."),
                ("Nikhil Sharma", 90, 120, "That's exactly the problem we solve. Every call gets automatically transcribed with speaker labels, so you have a searchable record of exactly who said what and when."),
                ("James Okafor", 120, 140, "What about action items, can those be assigned to specific people?"),
                ("Nikhil Sharma", 140, 165, "Yes, action items are extracted automatically from the conversation, and you can assign them, edit them, and mark them complete right from the meeting page."),
                ("Sarah Kim", 165, 185, "That would save us so much time. How does the summary work, is it accurate?"),
                ("Nikhil Sharma", 185, 210, "The summary highlights the key decisions and topics discussed, with bullet points you can scan in under a minute instead of re-reading a whole transcript."),
                ("James Okafor", 210, 235, "What about integrations? We live in Slack and Google Calendar."),
                ("Nikhil Sharma", 235, 255, "Those integrations are on our roadmap. Right now the core experience is the meeting library, transcripts, and summaries, with integrations coming next quarter."),
                ("Sarah Kim", 255, 275, "Understood. What would onboarding look like for our team of about twenty people?"),
                ("Nikhil Sharma", 275, 300, "Onboarding is straightforward, most people are comfortable within their first call. I can set up a pilot with five users to start if that's easier."),
                ("James Okafor", 300, 315, "A pilot sounds reasonable. Let's start there and revisit after two weeks."),
                ("Sarah Kim", 315, 330, "Agreed. Can you send over pricing for a five-person pilot?"),
                ("Nikhil Sharma", 330, 345, "Absolutely, I'll send that over by tomorrow along with a getting-started guide."),
                ("James Okafor", 345, 355, "Sounds great, thanks for the walkthrough today."),
                ("Sarah Kim", 355, 362, "Yes, this was really helpful, talk soon."),
            ],
            "summary_overview": "Discovery call with Brightside Retail (Sarah Kim and James Okafor) exploring meeting-transcription tools. Their current process is fully manual, leading to lost action items and no record of decisions. Walked through transcript search, automatic action item extraction, and AI summaries. They're interested in a 5-person pilot before rolling out to their ~20-person team, with Slack and Calendar integrations cited as a future need.",
            "key_points": [
                "Brightside's current process is manual note-taking with frequently lost action items.",
                "They specifically want speaker-labeled transcripts as a decision record.",
                "Slack and Google Calendar integrations are important but not a blocker for the pilot.",
                "Agreed to start with a 5-person pilot, revisit after two weeks.",
                "Pricing and a getting-started guide to be sent by the next day.",
            ],
            "action_items": [
                ("Send pricing for 5-person pilot to Brightside Retail", "Nikhil Sharma", False),
                ("Send getting-started guide to Sarah and James", "Nikhil Sharma", False),
                ("Schedule 2-week pilot check-in call", "Nikhil Sharma", False),
            ],
            "outline": [
                ("Introductions & current process pain points", 0),
                ("Product walkthrough: transcripts & action items", 90),
                ("Summary feature & integrations question", 185),
                ("Pilot proposal & next steps", 275),
            ],
        },
        {
            "title": "Backend Engineer - Candidate Debrief",
            "days_ago": 5,
            "duration_seconds": 720,  # 12 min
            "participants": ["Aditi Rao", "Marcus Lee", "Priya Menon"],
            "tags": ["Hiring"],
            "transcript": [
                ("Aditi Rao", 0, 20, "Let's debrief on the backend candidate from this morning. Marcus, you did the system design round, what did you think?"),
                ("Marcus Lee", 20, 55, "Strong overall. They designed a reasonable rate limiter, talked through trade-offs between token bucket and sliding window clearly, and asked good clarifying questions before diving in."),
                ("Aditi Rao", 55, 70, "Any concerns?"),
                ("Marcus Lee", 70, 95, "A bit slow to get to the database schema part, needed a nudge, but once there the design was solid. I'd lean towards a yes."),
                ("Priya Menon", 95, 130, "I did the coding round. They solved the first problem quickly and cleanly, the second one took longer but they got to a working solution with some hints on edge cases."),
                ("Aditi Rao", 130, 145, "How was their communication while working through it?"),
                ("Priya Menon", 145, 170, "Really good actually, they narrated their thinking the whole time, which made it easy to follow and to help them when they got stuck."),
                ("Aditi Rao", 170, 190, "That's a good sign. I did the behavioral round, they had solid examples of resolving conflict on a previous team and showed good ownership over a production incident they caused and fixed."),
                ("Marcus Lee", 190, 205, "Sounds like a consistent positive signal across all three rounds."),
                ("Aditi Rao", 205, 225, "Agreed. I'm comfortable moving forward with an offer. Priya, Marcus, are you both aligned?"),
                ("Priya Menon", 225, 230, "Yes, I'm in favor."),
                ("Marcus Lee", 230, 235, "Same here, let's move forward."),
                ("Aditi Rao", 235, 250, "Great, I'll loop in HR to get the offer process started today."),
            ],
            "summary_overview": "Hiring debrief for a backend engineering candidate after system design, coding, and behavioral rounds. All three interviewers gave positive signals: solid system design with minor pacing issues, clean problem-solving with strong communication in the coding round, and good conflict-resolution and ownership examples in the behavioral round. The panel unanimously agreed to move forward with an offer.",
            "key_points": [
                "System design round: solid rate limiter design, clear trade-off discussion, slightly slow to reach schema design.",
                "Coding round: clean solutions, strong narration of thought process, handled edge cases with light hints.",
                "Behavioral round: good conflict-resolution example and ownership of a past production incident.",
                "Unanimous panel decision to proceed with an offer.",
            ],
            "action_items": [
                ("Start offer process with HR", "Aditi Rao", False),
                ("Prepare consolidated feedback notes for HR", "Aditi Rao", True),
            ],
            "outline": [
                ("System design round feedback", 0),
                ("Coding round feedback", 95),
                ("Behavioral round feedback", 170),
                ("Final decision", 205),
            ],
        },
    ]

    # -----------------------------------------------------------------
    # 4) Insert everything
    # -----------------------------------------------------------------
    for m in meetings_data:
        meeting = Meeting(
            host_id=default_user.id,
            title=m["title"],
            date=now - timedelta(days=m["days_ago"]),
            duration_seconds=m["duration_seconds"],
            media_url=None,  # no real audio file; player uses a placeholder
            status="completed",
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        # Participants
        for name in m["participants"]:
            db.add(Participant(
                meeting_id=meeting.id,
                name=name,
                avatar_url=f"https://api.dicebear.com/7.x/initials/svg?seed={name.replace(' ', '%20')}",
            ))

        # Tags (many-to-many via MeetingTag)
        for tag_name in m["tags"]:
            db.add(MeetingTag(meeting_id=meeting.id, tag_id=tags[tag_name].id))

        # Transcript lines
        for speaker, start, end, text in m["transcript"]:
            db.add(TranscriptLine(
                meeting_id=meeting.id,
                speaker_name=speaker,
                start_time=float(start),
                end_time=float(end),
                text=text,
            ))

        # Summary + key points
        summary = Summary(meeting_id=meeting.id, overview=m["summary_overview"])
        db.add(summary)
        db.commit()
        db.refresh(summary)
        for idx, point in enumerate(m["key_points"]):
            db.add(SummaryKeyPoint(summary_id=summary.id, text=point, order_index=idx))

        # Action items
        for task, assignee, completed in m["action_items"]:
            db.add(ActionItem(
                meeting_id=meeting.id,
                task=task,
                assignee_name=assignee,
                is_completed=completed,
            ))

        # Outline items
        for idx, (title, start_time) in enumerate(m["outline"]):
            db.add(OutlineItem(
                meeting_id=meeting.id,
                title=title,
                start_time=float(start_time),
                order_index=idx,
            ))

        db.commit()

    db.close()
    print(f"Seeded {len(meetings_data)} meetings successfully into fireflies.db")


if __name__ == "__main__":
    seed()
