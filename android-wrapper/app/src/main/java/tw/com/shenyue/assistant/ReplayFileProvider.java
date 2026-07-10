package tw.com.shenyue.assistant;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.net.URLConnection;

public class ReplayFileProvider extends ContentProvider {
    static final String DIRECTORY_NAME = "replay-receiver";

    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public String getType(Uri uri) {
        String type = URLConnection.guessContentTypeFromName(uri == null ? "" : uri.getLastPathSegment());
        return type == null || type.length() == 0 ? "video/mp4" : type;
    }

    @Override
    public Cursor query(
            Uri uri,
            String[] projection,
            String selection,
            String[] selectionArgs,
            String sortOrder
    ) {
        File file;
        try {
            file = resolveFile(uri);
        } catch (FileNotFoundException error) {
            return null;
        }
        String[] columns = projection == null || projection.length == 0
                ? new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE }
                : projection;
        MatrixCursor cursor = new MatrixCursor(columns, 1);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String column : columns) {
            if (OpenableColumns.DISPLAY_NAME.equals(column)) row.add(file.getName());
            else if (OpenableColumns.SIZE.equals(column)) row.add(file.length());
            else row.add(null);
        }
        return cursor;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (mode != null && !mode.startsWith("r")) throw new FileNotFoundException("Read-only provider");
        return ParcelFileDescriptor.open(resolveFile(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    private File resolveFile(Uri uri) throws FileNotFoundException {
        if (getContext() == null || uri == null || uri.getLastPathSegment() == null) {
            throw new FileNotFoundException("Missing replay file");
        }
        File root = new File(getContext().getCacheDir(), DIRECTORY_NAME);
        File file = new File(root, new File(uri.getLastPathSegment()).getName());
        try {
            String rootPath = root.getCanonicalPath();
            String filePath = file.getCanonicalPath();
            if (!filePath.startsWith(rootPath + File.separator) || !file.isFile()) {
                throw new FileNotFoundException("Replay file is unavailable");
            }
            return file;
        } catch (FileNotFoundException error) {
            throw error;
        } catch (Exception error) {
            throw new FileNotFoundException(error.getMessage());
        }
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Read-only provider");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        return 0;
    }
}
