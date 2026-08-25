import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cv2
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
# SUPABASE
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
# VIDEO
# =========================================================

def ensure_yt_dlp():
    if shutil.which("yt-dlp"):
        return

    raise RuntimeError(
        "yt-dlp no está disponible en el runner. "
        "Verificá worker/requirements.txt."
    )


def download_video(
    url: str,
    output_dir: Path,
) -> Path:
    """
    Descarga una copia temporal del video para análisis.
    Intenta obtener MP4 compatible con OpenCV.
    """

    ensure_yt_dlp()

    output_template = str(
        output_dir / "source.%(ext)s"
    )

    command = [
        "yt-dlp",
        "--no-playlist",
        "--restrict-filenames",
        "--merge-output-format",
        "mp4",
        "-f",
        "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "-o",
        output_template,
        url,
    ]

    print("Descargando fuente audiovisual...")
    print(" ".join(command[:-1]) + " [URL]")

    result = subprocess.run(
        command,
        check=False,
        capture_output=True,
        text=True,
    )

    if result.stdout:
        print(result.stdout)

    if result.returncode != 0:
        if result.stderr:
            print(result.stderr)

        raise RuntimeError(
            "No se pudo obtener el video con yt-dlp. "
            "La fuente puede bloquear descargas desde GitHub Actions "
            "o requerir otro método de acceso."
        )

    files = list(output_dir.glob("source.*"))

    if not files:
        raise RuntimeError(
            "yt-dlp finalizó pero no se encontró el archivo descargado."
        )

    # Preferimos MP4 si existe.
    mp4 = output_dir / "source.mp4"

    if mp4.exists():
        return mp4

    return files[0]


def inspect_video(video_path: Path) -> dict:
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(
            "OpenCV no pudo abrir el video descargado."
        )

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
    frame_count = int(
        cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    )
    width = int(
        cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0
    )
    height = int(
        cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0
    )

    duration_seconds = (
        frame_count / fps
        if fps > 0
        else 0
    )

    cap.release()

    return {
        "fps": round(fps, 3),
        "frame_count": frame_count,
        "width": width,
        "height": height,
        "duration_seconds": round(
            duration_seconds,
            2,
        ),
    }


def extract_sample_frames(
    video_path: Path,
    output_dir: Path,
    interval_seconds: int = 60,
    max_frames: int = 20,
) -> list[dict]:
    """
    Fase 1:
    extrae fotogramas de control para confirmar que el video
    es procesable. Todavía no se ejecuta detección YOLO.
    """

    frames_dir = output_dir / "samples"
    frames_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    cap = cv2.VideoCapture(
        str(video_path)
    )

    if not cap.isOpened():
        raise RuntimeError(
            "No se pudo abrir el video para extraer frames."
        )

    fps = float(
        cap.get(cv2.CAP_PROP_FPS) or 0
    )

    frame_count = int(
        cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
    )

    duration_seconds = (
        frame_count / fps
        if fps > 0
        else 0
    )

    if duration_seconds <= 0:
        cap.release()

        raise RuntimeError(
            "No se pudo calcular la duración del video."
        )

    samples = []
    current_second = 0

    while (
        current_second <= duration_seconds
        and len(samples) < max_frames
    ):
        cap.set(
            cv2.CAP_PROP_POS_MSEC,
            current_second * 1000,
        )

        ok, frame = cap.read()

        if ok and frame is not None:
            filename = (
                f"sample_{current_second:05d}.jpg"
            )

            filepath = (
                frames_dir / filename
            )

            cv2.imwrite(
                str(filepath),
                frame,
            )

            samples.append(
                {
                    "second": current_second,
                    "file": filename,
                }
            )

        current_second += interval_seconds

    cap.release()

    return samples


# =========================================================
# PROCESAR JOB
# =========================================================

def process_job(job: dict):
    job_id = job["id"]
    video_id = job["video_id"]
    player_id = job.get("player_id")

    if not player_id:
        raise RuntimeError(
            "El job no tiene player_id."
        )

    print("=" * 64)
    print("SCOUT GK VISION - FASE 1")
    print(f"Job:     {job_id}")
    print(f"Video:   {video_id}")
    print(f"Jugador: {player_id}")
    print("=" * 64)

    update_job(
        job_id,
        status="PROCESSING",
        progress=5,
        analysis_engine="SCOUT_GK_VISION",
        model_version="0.3.0",
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
        raise RuntimeError(
            "No se encontró el video."
        )

    target = get_goalkeeper_target(
        video_id,
        player_id,
    )

    if not target:
        raise RuntimeError(
            "No existe configuración del arquero objetivo."
        )

    print(f"Título: {video.get('title')}")
    print(f"Fuente: {video.get('provider')}")
    print(f"Equipo GK: {target.get('team_name')}")
    print(f"Lado: {target.get('goalkeeper_side')}")

    update_target(
        target["id"],
        identification_status="TRACKING",
    )

    update_job(
        job_id,
        progress=10,
    )

    update_video(
        video_id,
        processing_progress=10,
    )

    source_url = video.get("url")

    if not source_url:
        raise RuntimeError(
            "El registro del video no tiene URL."
        )

    with tempfile.TemporaryDirectory(
        prefix="scout_gk_"
    ) as tmp:
        workdir = Path(tmp)

        video_path = download_video(
            source_url,
            workdir,
        )

        print(
            f"Archivo temporal: {video_path.name}"
        )

        update_job(
            job_id,
            progress=25,
        )

        update_video(
            video_id,
            processing_progress=25,
        )

        metadata = inspect_video(
            video_path
        )

        print("Metadatos:")
        print(metadata)

        update_job(
            job_id,
            progress=35,
        )

        update_video(
            video_id,
            processing_progress=35,
        )

        samples = extract_sample_frames(
            video_path,
            workdir,
            interval_seconds=60,
            max_frames=20,
        )

        print(
            f"Frames de control extraídos: {len(samples)}"
        )

        for sample in samples:
            print(
                f"  - {sample['second']} s -> {sample['file']}"
            )

        update_job(
            job_id,
            progress=45,
            candidate_events=0,
        )

        update_video(
            video_id,
            processing_progress=45,
        )

    # =====================================================
    # FIN FASE 1
    #
    # Si llegó hasta aquí:
    # - el worker obtuvo el video
    # - OpenCV lo pudo leer
    # - conocemos FPS / resolución / duración
    # - pudimos extraer fotogramas
    #
    # Próxima fase:
    # YOLO + detección de personas/pelota + tracking GK.
    # =====================================================

    update_target(
        target["id"],
        identification_status="CONFIGURED",
        tracking_confidence=None,
    )

    update_job(
        job_id,
        status="REVIEW",
        progress=50,
        model_version="0.3.0",
        candidate_events=0,
    )

    update_video(
        video_id,
        analysis_status="REVIEW",
        processing_progress=50,
    )

    print("")
    print("FASE 1 COMPLETADA")
    print("Video obtenido y procesable con OpenCV.")
    print("Estado final: REVIEW / 50%")


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
            print(
                f"No se pudo actualizar el job: {update_error}"
            )

    if video_id:
        try:
            update_video(
                video_id,
                analysis_status="FAILED",
            )
        except Exception as update_error:
            print(
                f"No se pudo actualizar el video: {update_error}"
            )


def run_once():
    print(
        "Buscando trabajo PENDING..."
    )

    job = get_pending_job()

    if not job:
        print(
            "No hay trabajos pendientes."
        )
        return

    try:
        process_job(job)

    except Exception as error:
        fail_job(
            job,
            error,
        )

        raise


if __name__ == "__main__":
    run_once()
