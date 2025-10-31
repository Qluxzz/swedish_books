module BookList exposing (..)

import Book
import Html
import Html.Attributes


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    let
        bView =
            Book.view viewOptions
    in
    [ if List.isEmpty ratedBooks then
        Html.text ""

      else
        section
            "Betygsatta böcker"
            "Klicka för att see information om boken på Goodreads"
            (List.map bView ratedBooks)
    , if List.isEmpty unratedBooks then
        Html.text ""

      else
        section
            "Mysterierna"
            "Dessa böcker är inte ens betygsatta, klicka på en för att läsa mer om den på Libris hemsida"
            (List.map bView unratedBooks)
    ]


section : String -> String -> List (Html.Html msg) -> Html.Html msg
section title description books =
    Html.section [ Html.Attributes.class "section" ]
        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text title ]
        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text description ]
        , Html.div [ Html.Attributes.class "book-grid" ] books
        ]
