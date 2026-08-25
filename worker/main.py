import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client


# =========================================================
# CONFIGURACIÓN
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("Falta SUPABASE_URL")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Falta SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# =========================================================
# JOBS
# =========================================================

def get_pending_job():
    response = (
        supabase
        .table("video_analysis_jobs")
        .select(
            """
            id,
            video_id,
            player_id,
            status,
            analysis_type,
            source_type,
            progress,
            analysis_engine,
            model_version,
            candidate_events,
            accepted_events,
            rejected_events,
            created_at
            """
        )
        .eq("status", "PENDING")
        .order("created_at")
        .limit(1)
        .execute()
    )

    rows = response.data or []
    return rows[0] if rows else None


def update_job(job_id: str, **values):
    values["updated_at"] = now_iso()

    return (
        supabase
        .table("video_analysis_jobs")
        .update(values)
        .eq("id", job_id)
        .execute()
    )


# =========================================================
# VIDEO / OBJETIVO
# =========================================================

def get_video(video_id: str):
    response = (
        supabase
        .table("videos")
        .select(
            """
            id,
            title,
            url,
            provider,
            external_video_id,
            player_id,
            goalkeeper_team,
            match_date,
            competition_name,
            home_team,
            away_team,
            analysis_status,
            processing_progress
            """
        )
        .eq("id", video_id)
        .single()
        .execute()
    )

    return response.data


def update_video(video_id: str, **values):
    values["updated_at"] = now_iso()

    return (
        supabase
        .table("videos")
        .update(values)
        .eq("id", video_id)
        .execute()
    )


def get_goalkeeper_target(video_id: str, player_id: str):
    response = (
        supabase
        .table("video_goalkeeper_targets")
        .select("*")
        .eq("video_id", video_id)
        .eq("player_id", player_id)
        .limit(1)
        .execute()
    )

    rows = response.data or []
    return rows[0] if rows else None


def update_target(target_id: str, **values):
    values["updated_at"] = now_iso()

    return (
        supabase
        .table("video_goalkeeper_targets")
        .update(values)
        .eq("id", target_id)
        .execute()
    )


# =========================================================
# PROCESAR UN JOB
# =========================================================

def process_job(job: dict):
    job_id = job["id"]
    video_id = job["video_id"]
    player_id = job.get("player_id")

    if not player_id:
        raise RuntimeError("El job no tiene player_id.")

    print("=" * 60)
    print("SCOUT GK - VIDEO WORKER")
    print(f"Job:     {job_id}")
    print(f"Video:   {video_id}")
    print(f"Jugador: {player_id}")
    print("=" * 60)

    update_job(
        job_id,
        status="PROCESSING",
        progress=5,
        analysis_engine="SCOUT_GK_VISION",
        model_version="0.2.0",
        started_at=now_iso(),
        error_message=None,
    )

    update_video(
        video_id,
        analysis_status="PROCESSING",
        processing_progress=5,
    )

    video = get_video(video_id)

    if not video:
        raise RuntimeError("No se encontró el video.")

    print(f"Título: {video.get('title')}")
    print(f"Fuente: {video.get('provider')}")
    print(f"URL:    {video.get('url')}")

    target = get_goalkeeper_target(video_id, player_id)

    if not target:
        raise RuntimeError(
            "No existe configuración del arquero objetivo. "
            "Configurá video_goalkeeper_targets antes de lanzar el análisis."
        )

    print("")
    print("Arquero objetivo")
    print(f"Equipo:    {target.get('team_name')}")
    print(f"Camiseta:  {target.get('shirt_number')}")
    print(f"Lado:      {target.get('goalkeeper_side')}")
    print(f"Inicio:    {target.get('initial_timestamp_seconds')} s")

    update_target(
        target["id"],
        identification_status="TRACKING",
    )

    update_job(job_id, progress=20)
    update_video(video_id, processing_progress=20)

    # =====================================================
    # PRUEBA V2
    # =====================================================
    #
    # En esta etapa verificamos todo el circuito:
    # Scout GK -> Supabase -> worker -> Supabase.
    #
    # Todavía NO descargamos ni analizamos frames.
    #
    # El próximo módulo incorporará:
    # - yt-dlp / descarga permitida de la fuente
    # - OpenCV
    # - YOLO
    # - tracking del arquero
    # - detección de pelota
    # - candidatos de acciones
    # =====================================================

    update_target(
        target["id"],
        identification_status="CONFIGURED",
        tracking_confidence=None,
    )

    update_job(
        job_id,
        status="REVIEW",
        progress=30,
        candidate_events=0,
    )

    update_video(
        video_id,
        analysis_status="REVIEW",
        processing_progress=30,
    )

    print("")
    print("OK: circuito del worker validado.")
    print("Estado final de prueba: REVIEW / 30%")


def fail_job(job: dict, error: Exception):
    job_id = job.get("id")
    video_id = job.get("video_id")

    print(f"ERROR: {error}")

    if job_id:
        try:
            update_job(
                job_id,
                status="FAILED",
                error_message=str(error),
            )
        except Exception as update_error:
            print(f"No se pudo actualizar el job: {update_error}")

    if video_id:
        try:
            update_video(
                video_id,
                analysis_status="FAILED",
            )
        except Exception as update_error:
            print(f"No se pudo actualizar el video: {update_error}")


# =========================================================
# EJECUCIÓN ÚNICA
# =========================================================

def run_once():
    print("Buscando trabajo PENDING...")

    job = get_pending_job()

    if not job:
        print("No hay trabajos pendientes.")
        return

    try:
        process_job(job)
    except Exception as error:
        fail_job(job, error)
        raise


if __name__ == "__main__":
    run_once()
