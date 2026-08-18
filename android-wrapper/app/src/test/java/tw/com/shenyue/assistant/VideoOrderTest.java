package tw.com.shenyue.assistant;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class VideoOrderTest {
    @Test
    public void extractsCommonCameraDateFormats() {
        assertEquals(1787056496000L, VideoOrder.timestampFromText("REC_20260818_123456.mp4"));
        assertEquals(1787056496000L, VideoOrder.timestampFromText("2026-08-18 12-34-56_front.ts"));
        assertEquals(1787056496000L, VideoOrder.timestampFromText("260818_123456.MOV"));
    }

    @Test
    public void filenameDateWinsOverStaleFilesystemTime() {
        long stale = 1609459200000L;
        assertEquals(1787056496000L, VideoOrder.sortTimestamp("REC_20260818_123456.mp4", "/USB1/REC", stale));
        assertEquals("filename-time", VideoOrder.sortBasis("REC_20260818_123456.mp4", "/USB1/REC", stale));
    }

    @Test
    public void fallsBackToStorageTimeWhenNoDateExists() {
        long modified = 1787036096000L;
        assertEquals(modified, VideoOrder.sortTimestamp("FRONT_0099.mp4", "/USB1/REC", modified));
        assertEquals("storage-time", VideoOrder.sortBasis("FRONT_0099.mp4", "/USB1/REC", modified));
    }

    @Test
    public void naturalSequencePlacesHigherCameraNumberFirst() {
        assertTrue(VideoOrder.compareNewestFirst(0L, "REC_100.mp4", "", 0L, "REC_99.mp4", "") < 0);
        assertTrue(VideoOrder.compareNewestFirst(0L, "REC_010.mp4", "", 0L, "REC_9.mp4", "") < 0);
    }

    @Test
    public void timestampAlwaysWinsBeforeSequence() {
        assertTrue(VideoOrder.compareNewestFirst(2000L, "REC_1.mp4", "", 1000L, "REC_999.mp4", "") < 0);
    }

    @Test
    public void invalidCalendarDateIsIgnored() {
        assertEquals(0L, VideoOrder.timestampFromText("REC_20260231_120000.mp4"));
    }
}
