// SPDX-License-Identifier: 0BSD
import QtQuick
import QtQuick.Layouts
import Spool

// Which file to play or download: every one the film has, with its size, the way a
// torrent client lists a release. Completes with {file}.
FocusScope {
    id: root

    property var provider
    readonly property bool saving: provider && provider.arguments.download === true
    property bool loading: true
    property string error: ""

    function size(bytes) {
        const units = saving ? ["B", "KiB", "MiB", "GiB"] : ["B", "KB", "MB", "GB"];
        let value = Number(bytes) || 0;
        let unit = 0;
        const base = saving ? 1024 : 1000;
        while (value >= base && unit < units.length - 1) {
            value /= base;
            unit += 1;
        }
        return value.toFixed(unit > 1 ? 1 : 0) + " " + units[unit];
    }

    Component.onCompleted: {
        provider.requestList("files", {
            "itemId": provider.arguments.itemId
        }).then(() => {
            if (provider.closed)
                return;
            loading = false;
            InputKeys.focus(list);
        }, code => {
            if (provider.closed)
                return;
            loading = false;
            error = code === "network_error" ? "Couldn't reach Blender's download server" : "Couldn't list the files";
            InputKeys.focus(cancelButton);
        });
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: Metrics.pageMarginPx
        spacing: Metrics.scaled(12)

        AppText {
            text: String(root.provider ? root.provider.arguments.title || "" : "")
            font.pixelSize: Metrics.titleSizePx
            font.weight: Font.DemiBold
        }

        SecondaryText {
            text: root.error || (root.loading ? "Reading the file list…" : root.saving ? "Choose a file to download. Saved exactly as published, at the size shown." : "Choose a file to play")
        }

        ListView {
            id: list
            Layout.fillWidth: true
            Layout.fillHeight: true
            clip: true
            focus: true
            keyNavigationEnabled: true
            model: root.provider ? root.provider.rows : null
            delegate: MenuRow {
                required property var record
                required property int index
                width: list.width
                label: record.title
                detail: [record.kind, record.quality, root.size(record.size)].filter(part => part).join(" · ")
                iconName: record.kind === "Trailer" ? "movie" : root.saving ? "download" : "play_arrow"
                highlighted: ListView.isCurrentItem && list.activeFocus
                onHovered: list.currentIndex = index
                onActivated: root.provider.complete({
                    "file": record.id
                })
            }
            function activate() {
                if (currentItem)
                    currentItem.activated();
            }
        }

        ActionButton {
            id: cancelButton
            Layout.alignment: Qt.AlignRight
            text: "Cancel"
            kind: "flat"
            onClicked: root.provider.close()
        }
    }
}
