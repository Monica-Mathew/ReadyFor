from strands import tool


@tool
def get_appointment_checklist(appointment_type: str) -> list[str]:
    """Get items a user should bring for a specific type of appointment."""

    appointment_type = appointment_type.lower()

    if appointment_type == "dentist":
        return [
            "Photo ID",
            "Dental insurance card",
            "FSA/HSA card if using one",
            "List of current medications if requested",
        ]

    return [
        "Photo ID",
        "Insurance card if applicable",
    ]