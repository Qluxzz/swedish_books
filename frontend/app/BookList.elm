module BookList exposing (..)

import Book
import Html
import Html.Attributes


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    [ Html.section [ Html.Attributes.class "section" ]
        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Betygsatta böcker" ]
        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Klicka för att see information om boken på Goodreads" ]
        , if List.isEmpty ratedBooks then
            Html.text "Inga böcker hittades"

          else
            Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) ratedBooks)
        ]
    , Html.section [ Html.Attributes.class "section" ]
        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Mysterierna" ]
        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Dessa böcker är inte ens betygsatta, klicka på en för att läsa mer om den på Libris hemsida" ]
        , if List.isEmpty ratedBooks then
            Html.text "Inga böcker hittades"

          else
            Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) unratedBooks)
        ]
    ]
