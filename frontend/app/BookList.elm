module BookList exposing (..)

import Book
import Html
import Html.Attributes


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    [ Html.section [ Html.Attributes.class "section" ]
        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Betygsatta böcker" ]
        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Dessa böcker hittades på Goodreads, men är ändå av mindre populära författare" ]
        , if List.isEmpty ratedBooks then
            Html.text "Inga böcker hittades"

          else
            Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) ratedBooks)
        ]
    , Html.section [ Html.Attributes.class "section" ]
        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Mysterierna" ]
        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Dessa böcker hittades inte ens på Goodreads. Klicka på en för läsa mer och se vart i Sverige du kan låna den" ]
        , if List.isEmpty ratedBooks then
            Html.text "Inga böcker hittades"

          else
            Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view viewOptions) unratedBooks)
        ]
    ]
