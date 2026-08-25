import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("Falta la variable SUPABASE_URL.")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("Falta la variable SUPABASE_SERVICE_ROLE_KEY.")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_pending_job():
    """
    Busca el trabajo de análisis pendiente más antiguo.

    La tabla esperada es `analysis_jobs`.
    Si tus nombres de columnas difieren, los ajustaremos en el siguiente paso.
    """
    response = (
        supabase.table("analysis_jobs")
        .select("*")
        .eq("status", "PENDING")
        .order("created_at")
        .limit(1)
        .execute()
    )

    rows = response.data or []
    return rows[0] if rows else None


def update_job(job_id: str, values: dict):
    return (
        supabase.table("analysis_jobs")
        .update(values)
        .eq("id", job_id)
        .execute()
    )


def process_job(job: dict):
    """
    Primera prueba del worker.

    Todavía NO analiza el video.
    Verifica que Python pueda:
      1. leer un trabajo de Supabase,
      2. marcarlo PROCESSING,
      3. finalizarlo como COMPLETED.

    Luego incorporaremos el motor audiovisual.
    """
    job_id = job["id"]

    print(f"[SCOUT GK] Procesando job: {job_id}")

    update_job(
        job_id,
        {
            "status": "PROCESSING",
            "started_at": utc_now(),
        },
    )

    # Simulación temporal del procesamiento.
    time.sleep(2)

    update_job(
        job_id,
        {
            "status": "COMPLETED",
            "completed_at": utc_now(),
        },
    )

    print(f"[SCOUT GK] Job completado: {job_id}")


def run_once():
    print("[SCOUT GK] Buscando trabajos pendientes...")

    job = get_pending_job()

    if not job:
        print("[SCOUT GK] No hay trabajos pendientes.")
        return

    try:
        process_job(job)
    except Exception as exc:
        job_id = job.get("id")

        print(f"[SCOUT GK] Error: {exc}")

        if job_id:
            try:
                update_job(
                    job_id,
                    {
                        "status": "FAILED",
                        "error_message": str(exc),
                        "completed_at": utc_now(),
                    },
                )
            except Exception as update_error:
                print(
                    "[SCOUT GK] No se pudo registrar el error "
                    f"en Supabase: {update_error}"
                )

        raise


if __name__ == "__main__":
    run_once()
