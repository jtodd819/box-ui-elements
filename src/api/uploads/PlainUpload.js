/**
 * @flow
 * @file Helper for the plain Box Upload API
 * @author Box
 */

import noop from 'lodash/noop';
import BaseUpload from './BaseUpload';

class PlainUpload extends BaseUpload {
    successCallback: Function;
    progressCallback: Function;

    /**
     * Handles an upload success response
     *
     * @param {Object} data - Upload success data
     * @return {void}
     */
    uploadSuccessHandler = ({ entries }: { entries: BoxItem[] }): void => {
        if (this.isDestroyed()) {
            return;
        }

        if (typeof this.successCallback === 'function') {
            // Response entries are the successfully created Box File objects
            this.successCallback(entries);
        }
    };

    /**
     * Handles an upload progress event
     *
     * @param {Object} event - Progress event
     * @return {void}
     */
    uploadProgressHandler = (event: ProgressEvent): void => {
        if (this.isDestroyed()) {
            return;
        }

        if (typeof this.progressCallback === 'function') {
            this.progressCallback(event);
        }
    };

    /**
     * Uploads a file. If a file ID is supplied, use the Upload File
     * Version API to replace the file.
     *
     * @param {Object} - Request options
     * @param {boolean} [options.url] - Upload URL to use
     * @return {void}
     */
    preflightSuccessHandler = ({ data }: { data: { upload_url?: string } }): void => {
        if (this.isDestroyed()) {
            return;
        }

        // Use provided upload URL if passed in, otherwise construct
        let uploadUrl = data.upload_url;
        if (!uploadUrl) {
            uploadUrl = `${this.getBaseUploadUrl()}/files/content`;

            if (this.fileId) {
                uploadUrl = uploadUrl.replace('content', `${this.fileId}/content`);
            }
        }

        const attributes = JSON.stringify({
            name: this.file.name,
            parent: { id: this.folderId }
        });

        this.xhr.uploadFile({
            url: uploadUrl,
            data: {
                attributes,
                file: this.file
            },
            successHandler: this.uploadSuccessHandler,
            errorHandler: this.preflightErrorHandler,
            progressHandler: this.uploadProgressHandler
        });
    };

    /**
     * Uploads a file. If there is a conflict and overwrite is true, replace the file.
     * Otherwise, re-upload with a different name.
     *
     * @param {Object} options - Upload options
     * @param {string} options.folderId - untyped folder id
     * @param {string} [options.fileId] - Untyped file id (e.g. no "file_" prefix)
     * @param {File} options.file - File blob object
     * @param {Function} [options.successCallback] - Function to call with response
     * @param {Function} [options.errorCallback] - Function to call with errors
     * @param {Function} [options.progressCallback] - Function to call with progress
     * @param {boolean} [overwrite] - Should upload overwrite file with same name
     * @return {void}
     */
    upload({
        folderId,
        fileId,
        file,
        successCallback = noop,
        errorCallback = noop,
        progressCallback = noop,
        overwrite = true
    }: {
        folderId: string,
        fileId: ?string,
        file: File,
        successCallback: Function,
        errorCallback: Function,
        progressCallback: Function,
        overwrite: boolean
    }): void {
        if (this.isDestroyed()) {
            return;
        }

        // Save references
        this.folderId = folderId;
        this.fileId = fileId;
        this.file = file;
        this.successCallback = successCallback;
        this.errorCallback = errorCallback;
        this.progressCallback = progressCallback;
        this.overwrite = overwrite;

        this.makePreflightRequest();
    }

    /**
     * Cancels upload of a file.
     *
     * @return {void}
     */
    cancel() {
        if (this.isDestroyed()) {
            return;
        }

        if (this.xhr && typeof this.xhr.abort === 'function') {
            this.xhr.abort();
        }

        clearTimeout(this.retryTimeout);
    }
}

export default PlainUpload;