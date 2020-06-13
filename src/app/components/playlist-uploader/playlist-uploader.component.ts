import { Component, EventEmitter } from '@angular/core';
import {
    UploadOutput,
    UploadInput,
    UploadFile,
    humanizeBytes,
    UploaderOptions,
} from 'ngx-uploader';
import { ChannelStore, createChannel } from 'src/app/state';
import { M3uService } from 'src/app/services/m3u-service.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-playlist-uploader',
    templateUrl: './playlist-uploader.component.html',
    styleUrls: ['./playlist-uploader.component.css'],
})
export class PlaylistUploaderComponent {
    formData: FormData;
    files: UploadFile[];
    uploadInput: EventEmitter<UploadInput>;
    humanizeBytes: Function;
    dragOver: boolean;
    options: UploaderOptions;
    playlists: any;

    /**
     * Creates an instanceof PlaylistUploaderComponent
     * @param channelStore channels store
     * @param m3uService m3u service
     * @param router angulars router
     */
    constructor(
        private channelStore: ChannelStore,
        private m3uService: M3uService,
        private router: Router
    ) {
        this.getPlaylists();

        this.options = {
            concurrency: 1,
            maxUploads: 1,
        };
        this.files = [];
        this.uploadInput = new EventEmitter<UploadInput>();
        this.humanizeBytes = humanizeBytes;
    }

    /**
     * Handles file upload
     * @param output
     */
    onUploadOutput(output: UploadOutput): void {
        if (output.type === 'allAddedToQueue') {
            if (this.files.length > 0) {
                const fileReader = new FileReader();
                fileReader.onload = fileLoadedEvent => {
                    const result = (fileLoadedEvent.target as FileReader)
                        .result;

                    const array = (result as string).split('\n');
                    const playlist = this.m3uService.convertArrayToPlaylist(
                        array
                    );
                    this.savePlaylist(
                        this.files[0].name,
                        JSON.stringify(playlist)
                    );

                    this.setPlaylist(playlist);
                };
                fileReader.readAsText(this.files[0].nativeFile);
            }
        } else if (
            output.type === 'addedToQueue' &&
            typeof output.file !== 'undefined'
        ) {
            this.files.push(output.file);
        } else if (
            output.type === 'uploading' &&
            typeof output.file !== 'undefined'
        ) {
            const index = this.files.findIndex(
                file =>
                    typeof output.file !== 'undefined' &&
                    file.id === output.file.id
            );
            this.files[index] = output.file;
        } else if (output.type === 'cancelled' || output.type === 'removed') {
            this.files = this.files.filter(
                (file: UploadFile) => file !== output.file
            );
        } else if (output.type === 'dragOver') {
            this.dragOver = true;
        } else if (output.type === 'dragOut') {
            this.dragOver = false;
        } else if (output.type === 'drop') {
            this.dragOver = false;
        } else if (
            output.type === 'rejected' &&
            typeof output.file !== 'undefined'
        ) {
            console.log(output.file.name + ' rejected');
        }
    }

    /**
     * Navigates to the video player route
     */
    navigateToPlayer(): void {
        this.router.navigateByUrl('/iptv', { skipLocationChange: true });
    }

    /**
     * Saves playlist to the localStorage
     * @param name name of the playlist
     * @param playlist playlist to save
     */
    savePlaylist(name: string, playlist: any): void {
        localStorage.setItem(name, playlist);
    }

    /**
     * Reads all saved playlists from the localStorage
     */
    getPlaylists(): void {
        this.playlists = { ...localStorage };

        this.playlists = Object.keys(this.playlists)
            .filter(key => key.includes('.m3u'))
            .reduce((obj, key) => {
                obj[key] = JSON.parse(this.playlists[key]);
                return obj;
            }, {});
    }

    /**
     * Sets the given playlist as active for the current session
     * @param playlist m3u playlist
     */
    setPlaylist(playlist: any): void {
        playlist.segments.forEach(element => {
            this.channelStore.add(createChannel(element));
            this.navigateToPlayer();
        });
    }
}