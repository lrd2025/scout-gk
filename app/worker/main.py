import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client, Client


# =========================================================
# CONFIGURACIÓN
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)


if not SUPABASE_URL:
    raise RuntimeError(
        "Falta SUPABASE_URL"
    )


if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Falta SUPABASE_SERVICE_ROLE_KEY"
    )


supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


# =========================================================
# UTILIDADES
# =========================================================

def now_iso():
    return datetime.now(
        timezone.utc
    ).isoformat()


# =========================================================
# OBTENER JOB PENDIENTE
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
            model_version
            """
        )
        .eq(
            "status",
            "PENDING"
        )
        .order(
            "created_at"
        )
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


# =========================================================
# CARGAR VIDEO
# =========================================================

def get_video(video_id):
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
            away_team
            """
        )
        .eq(
            "id",
            video_id
        )
        .single()
        .execute()
    )

    return response.data


# =========================================================
# CARGAR ARQUERO OBJETIVO
# =========================================================

def get_goalkeeper_target(
    video_id,
    player_id
):
    response = (
        supabase
        .table(
            "video_goalkeeper_targets"
        )
        .select("*")
        .eq(
            "video_id",
            video_id
        )
        .eq(
            "player_id",
            player_id
        )
        .limit(1)
        .execute()
    )

    if not response.data:
        return None

    return response.data[0]


# =========================================================
# ACTUALIZAR JOB
# =========================================================

def update_job(
    job_id,
    **values
):
    values["updated_at"] = now_iso()

    (
        supabase
        .table(
            "video_analysis_jobs"
        )
        .update(values)
        .eq(
            "id",
            job_id
        )
        .execute()
    )


# =========================================================
# ACTUALIZAR VIDEO
# =========================================================

def update_video(
    video_id,
    **values
):
    values["updated_at"] = now_iso()

    (
        supabase
        .table("videos")
        .update(values)
        .eq(
            "id",
            video_id
        )
        .execute()
    )


# =========================================================
# PROCESAR JOB
# =========================================================

def process_job(job):
    job_id = job["id"]
    video_id = job["video_id"]
    player_id = job["player_id"]

    print(
        "\n================================="
    )

    print(
        f"Procesando job: {job_id}"
    )

    print(
        f"Video: {video_id}"
    )

    print(
        f"Jugador: {player_id}"
    )

    print(
        "=================================\n"
    )

    try:

        # -------------------------------------------------
        # JOB → PROCESSING
        # -------------------------------------------------

        update_job(
            job_id,
            status="PROCESSING",
            progress=5,
            analysis_engine="SCOUT_GK_VISION",
            model_version="0.1.0",
            started_at=now_iso(),
        )

        update_video(
            video_id,
            analysis_status="PROCESSING",
            processing_progress=5,
        )


        # -------------------------------------------------
        # CARGAR VIDEO
        # -------------------------------------------------

        video = get_video(
            video_id
        )

        if not video:
            raise RuntimeError(
                "Video no encontrado."
            )

        print(
            f"Video: {video.get('title')}"
        )

        print(
            f"Fuente: {video.get('provider')}"
        )

        print(
            f"URL: {video.get('url')}"
        )


        update_job(
            job_id,
            progress=10,
        )

        update_video(
            video_id,
            processing_progress=10,
        )


        # -------------------------------------------------
        # CARGAR ARQUERO OBJETIVO
        # -------------------------------------------------

        target = (
            get_goalkeeper_target(
                video_id,
                player_id
            )
        )

        if not target:
            raise RuntimeError(
                "No existe configuración del arquero objetivo."
            )

        print(
            "\nArquero objetivo:"
        )

        print(
            f"Equipo: {target.get('team_name')}"
        )

        print(
            f"Camiseta: {target.get('shirt_number')}"
        )

        print(
            f"Lado: {target.get('goalkeeper_side')}"
        )

        print(
            f"Inicio: {target.get('initial_timestamp_seconds')} s"
        )


        # -------------------------------------------------
        # ETAPA DE IDENTIFICACIÓN
        # -------------------------------------------------

        (
            supabase
            .table(
                "video_goalkeeper_targets"
            )
            .update({
                "identification_status":
                    "TRACKING",

                "updated_at":
                    now_iso(),
            })
            .eq(
                "id",
                target["id"]
            )
            .execute()
        )


        update_job(
            job_id,
            progress=20,
        )

        update_video(
            video_id,
            processing_progress=20,
        )


        # =================================================
        # AQUÍ SE INCORPORARÁ EL MOTOR DE VISIÓN
        # =================================================
        #
        # PRÓXIMA ETAPA:
        #
        # 1. Obtener video
        # 2. Extraer frames
        # 3. YOLO detecta personas
        # 4. Detectar pelota
        # 5. Identificar arquero objetivo
        # 6. ByteTrack mantiene identidad
        # 7. Determinar zona del campo
        # 8. Crear segmentos
        # 9. Detectar acciones candidatas
        #
        # =================================================


        print(
            "\nWorker conectado correctamente."
        )

        print(
            "Motor de visión todavía no ejecutado."
        )


        # -------------------------------------------------
        # V1: DEJAR EN REVIEW
        # -------------------------------------------------

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


        (
            supabase
            .table(
                "video_goalkeeper_targets"
            )
            .update({
                "identification_status":
                    "CONFIGURED",

                "tracking_confidence":
                    None,

                "updated_at":
                    now_iso(),
            })
            .eq(
                "id",
                target["id"]
            )
            .execute()
        )


        print(
            "\nJob finalizado correctamente."
        )


    except Exception as error:

        print(
            f"\nERROR: {error}"
        )

        update_job(
            job_id,
            status="FAILED",
            error_message=str(
                error
            ),
        )

        update_video(
            video_id,
            analysis_status="FAILED",
        )


# =========================================================
# WORKER
# =========================================================

def run_worker():

    print(
        "================================="
    )

    print(
        "SCOUT GK - VIDEO AI WORKER"
    )

    print(
        "Versión 0.1.0"
    )

    print(
        "================================="
    )

    while True:

        try:

            job = get_pending_job()

            if job:

                process_job(
                    job
                )

            else:

                print(
                    "Sin trabajos pendientes."
                )

        except Exception as error:

            print(
                f"Error general: {error}"
            )

        time.sleep(10)


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":
    run_worker()
