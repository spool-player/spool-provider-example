// SPDX-License-Identifier: 0BSD
import QtQuick
import QtQuick.Layouts
import Spool

// Which file to play: every one the film has, with its size, the way a
// torrent client lists a release. Completes with {file}.
FocusScope {
    id: root

    property var provider
    property bool loading: true
    property string error: ""

    function size(bytes) {
        const units = ["B", "KB", "MB", "GB"]
        let value = Number(bytes) || 0
        let unit = 0
        while (value >= 1000 && unit < units.length - 1) {
            value /= 1000
            unit += 1
        }
        return value.toFixed(unit > 1 ? 1 : 0) + " " + units[unit]
    }

    Component.onCompleted: {
        provider.requestList("files", { "itemId": provider.arguments.itemId }).then(() => {
            loading = false
            InputKeys.focus(list)
        }, code => {
            loading = false
            error = code === "network_error" ? "Couldn't reach Blender's download server" : "Couldn't list the files"
        })
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
            text: root.error || (root.loading ? "Reading the file list…" : "Choose a file to play")
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
                iconName: record.kind === "Trailer" ? "movie" : "play_arrow"
                highlighted: ListView.isCurrentItem && list.activeFocus
                onHovered: list.currentIndex = index
                onActivated: root.provider.complete({ "file": record.id })
            }
            function activate() {
                if (currentItem)
                    currentItem.activated()
            }
        }

        ActionButton {
            Layout.alignment: Qt.AlignRight
            text: "Cancel"
            kind: "flat"
            onClicked: root.provider.close()
        }
    }
}
