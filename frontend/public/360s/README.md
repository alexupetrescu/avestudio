# 360° Panoramas

Place your equirectangular 360° panorama images here.

## Folder structure for multi-image tours

Create a subfolder for each tour. Images in each folder are shown in sequence.

```
public/360s/
├── pista-bob/           # Tour slug = "pista-bob" → /360view/pista-bob
│   ├── room-001.jpeg   # First panorama
│   ├── room-002.jpeg   # Second
│   └── room-003.jpeg   # Third
└── alt-tour/
    ├── view-001.jpg
    └── view-002.jpg
```

## Naming convention

Use the pattern: `{name}-{001|002|003...}.{jpeg|jpg|png|webp}`

- `-001` = first image in the sequence
- `-002` = second image
- `-003` = third image
- etc.

Examples: `room-001.jpeg`, `view-002.jpg`, `panorama-003.png`

## Single image (legacy)

For a single panorama without a folder, use: `DSC07454-Panorama.jpg` (or any `name-001.ext` in the root `360s/` folder).

If your file has a space in the name, use a hyphen instead to avoid URL encoding issues.
